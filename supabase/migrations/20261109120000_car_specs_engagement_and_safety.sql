/*
# Car specs, listing lifecycle, favorites, reports and anti-spam

Plain-English summary: adds the car details buyers expect (colour, condition, body type,
customs status), a "sold" flag, a 60-day listing life with renewal, a view counter,
favorites, an "report this ad" table for moderators, and server-side limits on how fast
visitors can send messages or reports. Editing an approved ad's text or photos sends it
back to review so moderation cannot be bypassed.

## Changed tables
- `listings`: new columns `color`, `condition`, `body_type`, `customs_status`, `is_sold`,
  `sold_at`, `expires_at`, `views_count` (all with safe defaults; existing rows get a
  60-day life starting from this migration).

## New tables
- `favorites` (owner-only rows).
- `listing_reports` (anyone can report an approved ad; only admins can read or manage).

## New / replaced functions
- `create_listing(...)` replaced: accepts the new car fields (old signature dropped).
- `update_listing_images(listing, urls[])`: owner replaces the photo set (1 to 8).
- `renew_listing(listing)`: owner extends the ad life by 60 days.
- `increment_listing_views(listing)`: public view counter.
- `guard_listing_write()` replaced: owners may resubmit (approved/rejected -> pending),
  and editing title/description/phone/make/model resets an approved ad to pending.
- Throttle triggers on `listing_contact_messages` and `listing_reports`.

## Security notes
- Owners can only update the listed columns (column-level grant). `expires_at`,
  `views_count` and `status` can only change through the functions above or by admins.
- All new tables have RLS enabled.

## Rollback
Drop the new tables/functions and columns; restore the previous `create_listing` and
`guard_listing_write` definitions from migrations 20261030143210 and 20261030143141.
*/

-- ============ listings: new columns ============
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS body_type text,
  ADD COLUMN IF NOT EXISTS customs_status text,
  ADD COLUMN IF NOT EXISTS is_sold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sold_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_condition_valid;
ALTER TABLE public.listings ADD CONSTRAINT listings_condition_valid
  CHECK (condition IS NULL OR condition IN ('new', 'used'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_customs_valid;
ALTER TABLE public.listings ADD CONSTRAINT listings_customs_valid
  CHECK (customs_status IS NULL OR customs_status IN ('cleared', 'not_cleared'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_body_type_valid;
ALTER TABLE public.listings ADD CONSTRAINT listings_body_type_valid
  CHECK (body_type IS NULL OR body_type IN ('sedan', 'suv', 'hatchback', 'pickup', 'coupe', 'van', 'convertible', 'other'));

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_color_length;
ALTER TABLE public.listings ADD CONSTRAINT listings_color_length
  CHECK (color IS NULL OR char_length(color) <= 30);

CREATE INDEX IF NOT EXISTS listings_public_feed_idx
  ON public.listings (status, is_sold, expires_at, created_at DESC);
CREATE INDEX IF NOT EXISTS listings_user_idx ON public.listings (user_id);
CREATE INDEX IF NOT EXISTS listings_make_idx ON public.listings (car_make);
CREATE INDEX IF NOT EXISTS listings_city_idx ON public.listings (city_id);
CREATE INDEX IF NOT EXISTS listings_price_idx ON public.listings (price);

-- Owners may edit these columns directly (status, owner, expiry and views are not included).
GRANT UPDATE (color, condition, body_type, customs_status, is_sold) ON public.listings TO authenticated;

-- ============ guard trigger (replaces the previous version) ============
CREATE OR REPLACE FUNCTION public.guard_listing_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.year IS NOT NULL AND NEW.year > extract(year FROM now())::int + 1 THEN
    RAISE EXCEPTION 'Manufacturing year is out of range' USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Listing owner must be the signed-in user' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF coalesce(auth.role(), '') IN ('anon', 'authenticated') AND NOT is_admin() THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Listing owner cannot be changed' USING ERRCODE = '42501';
    END IF;

    -- The only status change an owner can make is sending an ad back to review.
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (NEW.status = 'pending' AND OLD.status IN ('approved', 'rejected')) THEN
      RAISE EXCEPTION 'Listing status cannot be changed' USING ERRCODE = '42501';
    END IF;

    -- Editing the public text of an approved or rejected ad sends it back to moderation.
    IF OLD.status IN ('approved', 'rejected') AND NEW.status = OLD.status AND (
         NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.phone IS DISTINCT FROM OLD.phone
      OR NEW.car_make IS DISTINCT FROM OLD.car_make
      OR NEW.car_model IS DISTINCT FROM OLD.car_model
    ) THEN
      NEW.status := 'pending';
    END IF;
  END IF;

  IF NEW.is_sold IS DISTINCT FROM OLD.is_sold THEN
    NEW.sold_at := CASE WHEN NEW.is_sold THEN now() ELSE NULL END;
  END IF;

  RETURN NEW;
END;
$$;

-- ============ create_listing (new signature with car details) ============
DROP FUNCTION IF EXISTS public.create_listing(text, text, text, uuid, uuid, numeric, boolean, text, text, text, text, text, integer, integer, text[]);

CREATE OR REPLACE FUNCTION public.create_listing(
  p_title text,
  p_description text,
  p_ad_type text,
  p_category_id uuid,
  p_city_id uuid,
  p_price numeric,
  p_is_negotiable boolean,
  p_phone text,
  p_car_make text,
  p_car_model text,
  p_fuel_type text,
  p_transmission text,
  p_year integer,
  p_mileage_km integer,
  p_image_urls text[],
  p_color text DEFAULT NULL,
  p_condition text DEFAULT NULL,
  p_body_type text DEFAULT NULL,
  p_customs_status text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_listing_id uuid;
  v_count int := coalesce(cardinality(p_image_urls), 0);
  v_url text;
  v_object text;
  v_negotiable boolean := coalesce(p_is_negotiable, false);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  IF char_length(btrim(coalesce(p_title, ''))) NOT BETWEEN 5 AND 100 THEN
    RAISE EXCEPTION 'Title must be between 5 and 100 characters';
  END IF;
  IF char_length(coalesce(p_description, '')) NOT BETWEEN 20 AND 3000 THEN
    RAISE EXCEPTION 'Description must be between 20 and 3000 characters';
  END IF;
  IF p_ad_type IS NULL OR p_ad_type NOT IN ('sale', 'rent') THEN
    RAISE EXCEPTION 'Invalid ad type';
  END IF;
  IF p_price IS NOT NULL AND p_price < 0 THEN
    RAISE EXCEPTION 'Price cannot be negative';
  END IF;
  IF p_price IS NULL AND NOT v_negotiable THEN
    RAISE EXCEPTION 'Enter a price or mark the price as negotiable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cities WHERE id = p_city_id) THEN
    RAISE EXCEPTION 'Invalid city';
  END IF;
  IF p_category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.listing_categories WHERE id = p_category_id) THEN
    RAISE EXCEPTION 'Invalid category';
  END IF;
  IF p_fuel_type IS NOT NULL AND p_fuel_type NOT IN ('petrol', 'diesel', 'hybrid', 'electric') THEN
    RAISE EXCEPTION 'Invalid fuel type';
  END IF;
  IF p_transmission IS NOT NULL AND p_transmission NOT IN ('automatic', 'manual') THEN
    RAISE EXCEPTION 'Invalid transmission';
  END IF;
  IF p_year IS NOT NULL AND p_year NOT BETWEEN 1950 AND extract(year FROM now())::int + 1 THEN
    RAISE EXCEPTION 'Manufacturing year is out of range';
  END IF;
  IF p_mileage_km IS NOT NULL AND p_mileage_km NOT BETWEEN 0 AND 2000000 THEN
    RAISE EXCEPTION 'Mileage is out of range';
  END IF;
  IF p_condition IS NOT NULL AND p_condition NOT IN ('new', 'used') THEN
    RAISE EXCEPTION 'Invalid condition';
  END IF;
  IF p_customs_status IS NOT NULL AND p_customs_status NOT IN ('cleared', 'not_cleared') THEN
    RAISE EXCEPTION 'Invalid customs status';
  END IF;
  IF p_body_type IS NOT NULL AND p_body_type NOT IN ('sedan', 'suv', 'hatchback', 'pickup', 'coupe', 'van', 'convertible', 'other') THEN
    RAISE EXCEPTION 'Invalid body type';
  END IF;
  IF p_color IS NOT NULL AND char_length(btrim(p_color)) > 30 THEN
    RAISE EXCEPTION 'Colour is too long';
  END IF;

  IF v_count NOT BETWEEN 1 AND 8 THEN
    RAISE EXCEPTION 'A listing needs between 1 and 8 photos';
  END IF;
  IF (SELECT count(DISTINCT u) FROM unnest(p_image_urls) AS u) <> v_count THEN
    RAISE EXCEPTION 'Duplicate photos are not allowed';
  END IF;

  FOREACH v_url IN ARRAY p_image_urls LOOP
    v_object := substring(v_url FROM '/listing-images/([^?#]+)$');
    IF v_object IS NULL
       OR v_object NOT LIKE v_user::text || '/%'
       OR v_object LIKE '%..%'
       OR NOT EXISTS (
         SELECT 1 FROM storage.objects o
         WHERE o.bucket_id = 'listing-images' AND o.name = v_object
       ) THEN
      RAISE EXCEPTION 'One of the photos is missing or invalid';
    END IF;
  END LOOP;

  INSERT INTO public.listings (
    title, description, price, is_negotiable, category_id, city_id, user_id, ad_type,
    phone, image_url, status, car_make, car_model, fuel_type, transmission, year, mileage_km,
    color, condition, body_type, customs_status
  )
  VALUES (
    btrim(p_title), btrim(p_description), p_price, v_negotiable, p_category_id, p_city_id, v_user, p_ad_type,
    coalesce(btrim(p_phone), ''), p_image_urls[1], 'pending', nullif(btrim(p_car_make), ''), nullif(btrim(p_car_model), ''),
    p_fuel_type, p_transmission, p_year, p_mileage_km,
    nullif(btrim(p_color), ''), p_condition, p_body_type, p_customs_status
  )
  RETURNING id INTO v_listing_id;

  INSERT INTO public.listing_images (listing_id, image_url, sort_order)
  SELECT v_listing_id, u.url, u.ord - 1
  FROM unnest(p_image_urls) WITH ORDINALITY AS u(url, ord);

  RETURN v_listing_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_listing(text, text, text, uuid, uuid, numeric, boolean, text, text, text, text, text, integer, integer, text[], text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_listing(text, text, text, uuid, uuid, numeric, boolean, text, text, text, text, text, integer, integer, text[], text, text, text, text) TO authenticated;

-- ============ update_listing_images: owner replaces the photo set ============
CREATE OR REPLACE FUNCTION public.update_listing_images(p_listing_id uuid, p_image_urls text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_status text;
  v_count int := coalesce(cardinality(p_image_urls), 0);
  v_url text;
  v_object text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  SELECT user_id, status INTO v_owner, v_status FROM public.listings WHERE id = p_listing_id;
  IF v_owner IS NULL OR v_owner <> v_user THEN
    RAISE EXCEPTION 'Listing not found' USING ERRCODE = '42501';
  END IF;

  IF v_count NOT BETWEEN 1 AND 8 THEN
    RAISE EXCEPTION 'A listing needs between 1 and 8 photos';
  END IF;
  IF (SELECT count(DISTINCT u) FROM unnest(p_image_urls) AS u) <> v_count THEN
    RAISE EXCEPTION 'Duplicate photos are not allowed';
  END IF;

  FOREACH v_url IN ARRAY p_image_urls LOOP
    v_object := substring(v_url FROM '/listing-images/([^?#]+)$');
    IF v_object IS NULL
       OR v_object NOT LIKE v_user::text || '/%'
       OR v_object LIKE '%..%'
       OR NOT EXISTS (
         SELECT 1 FROM storage.objects o
         WHERE o.bucket_id = 'listing-images' AND o.name = v_object
       ) THEN
      RAISE EXCEPTION 'One of the photos is missing or invalid';
    END IF;
  END LOOP;

  -- Only touch the photos when the set actually changed.
  IF (SELECT array_agg(image_url ORDER BY sort_order) FROM public.listing_images WHERE listing_id = p_listing_id)
       IS NOT DISTINCT FROM p_image_urls THEN
    RETURN;
  END IF;

  DELETE FROM public.listing_images WHERE listing_id = p_listing_id;

  INSERT INTO public.listing_images (listing_id, image_url, sort_order)
  SELECT p_listing_id, u.url, u.ord - 1
  FROM unnest(p_image_urls) WITH ORDINALITY AS u(url, ord);

  UPDATE public.listings
  SET image_url = p_image_urls[1],
      status = CASE WHEN status IN ('approved', 'rejected') THEN 'pending' ELSE status END
  WHERE id = p_listing_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_listing_images(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_listing_images(uuid, text[]) TO authenticated;

-- ============ renew_listing ============
CREATE OR REPLACE FUNCTION public.renew_listing(p_listing_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new timestamptz := now() + interval '60 days';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.listings
  SET expires_at = v_new
  WHERE id = p_listing_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found' USING ERRCODE = '42501';
  END IF;
  RETURN v_new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.renew_listing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.renew_listing(uuid) TO authenticated;

-- ============ increment_listing_views ============
CREATE OR REPLACE FUNCTION public.increment_listing_views(p_listing_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.listings
  SET views_count = views_count + 1
  WHERE id = p_listing_id AND status = 'approved';
$$;

REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO anon, authenticated;

-- ============ favorites ============
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.favorites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_favorites_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.favorites WHERE user_id = NEW.user_id) >= 300 THEN
    RAISE EXCEPTION 'Too many favorites' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_favorites_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_favorites_limit ON public.favorites;
CREATE TRIGGER guard_favorites_limit
BEFORE INSERT ON public.favorites
FOR EACH ROW EXECUTE FUNCTION public.guard_favorites_limit();

-- ============ listing_reports ============
CREATE TABLE IF NOT EXISTS public.listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  reason text NOT NULL CHECK (reason IN ('fraud', 'sold', 'wrong_info', 'duplicate', 'inappropriate', 'other')),
  details text CHECK (details IS NULL OR char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_reports_status_created_idx
  ON public.listing_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS listing_reports_listing_idx
  ON public.listing_reports (listing_id);

ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_for_approved_listing" ON public.listing_reports;
CREATE POLICY "reports_insert_for_approved_listing" ON public.listing_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (reporter_id IS NULL OR reporter_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status = 'approved')
  );

DROP POLICY IF EXISTS "reports_select_admin" ON public.listing_reports;
CREATE POLICY "reports_select_admin" ON public.listing_reports
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "reports_update_admin" ON public.listing_reports;
CREATE POLICY "reports_update_admin" ON public.listing_reports
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "reports_delete_admin" ON public.listing_reports;
CREATE POLICY "reports_delete_admin" ON public.listing_reports
  FOR DELETE TO authenticated USING (public.is_admin());

REVOKE ALL ON public.listing_reports FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.listing_reports TO anon, authenticated;
GRANT SELECT, DELETE ON public.listing_reports TO authenticated;
GRANT UPDATE (status) ON public.listing_reports TO authenticated;

-- ============ anti-spam throttles ============
CREATE OR REPLACE FUNCTION public.throttle_listing_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.listing_reports
      WHERE listing_id = NEW.listing_id AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Too many reports for this listing' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.reporter_id IS NOT NULL AND (SELECT count(*) FROM public.listing_reports
      WHERE reporter_id = NEW.reporter_id AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Too many reports from this account' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.throttle_listing_reports() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS throttle_listing_reports ON public.listing_reports;
CREATE TRIGGER throttle_listing_reports
BEFORE INSERT ON public.listing_reports
FOR EACH ROW EXECUTE FUNCTION public.throttle_listing_reports();

CREATE OR REPLACE FUNCTION public.throttle_contact_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Same contact detail: at most 5 messages per hour.
  IF (SELECT count(*) FROM public.listing_contact_messages
      WHERE lower(btrim(sender_contact)) = lower(btrim(NEW.sender_contact))
        AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'Too many messages from this contact' USING ERRCODE = 'check_violation';
  END IF;

  -- One listing: at most 30 messages per hour (flood protection for sellers).
  IF (SELECT count(*) FROM public.listing_contact_messages
      WHERE listing_id = NEW.listing_id AND created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'Too many messages for this listing' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.throttle_contact_messages() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS throttle_contact_messages ON public.listing_contact_messages;
CREATE TRIGGER throttle_contact_messages
BEFORE INSERT ON public.listing_contact_messages
FOR EACH ROW EXECUTE FUNCTION public.throttle_contact_messages();
