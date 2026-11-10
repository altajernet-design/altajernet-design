import type { ListingDraftForm } from './listingDraft';
import { toEnglishDigits, PHONE_PATTERN } from './contact';
import { CAR_CATEGORY_SLUGS, CURRENT_YEAR, MAX_MILEAGE } from './carData';
import type { ListingCategory } from './supabase';

export function isCarCategory(categories: ListingCategory[], categoryId: string): boolean {
  const slug = categories.find((c) => c.id === categoryId)?.slug;
  return slug ? CAR_CATEGORY_SLUGS.includes(slug) : false;
}

export function getFormError(form: ListingDraftForm, imageCount: number): string | null {
  const title = form.title.trim();
  const description = form.description.trim();
  const price = toEnglishDigits(form.price).trim();
  const phone = toEnglishDigits(form.phone).trim();
  const year = toEnglishDigits(form.year).trim();
  const mileage = toEnglishDigits(form.mileage_km).trim();

  if (imageCount < 1) return 'أضف صورة واحدة على الأقل';
  if (title.length < 5 || title.length > 100) return 'العنوان يجب أن يكون بين 5 و100 حرف';
  if (description.length < 20 || description.length > 3000) return 'الوصف يجب أن يكون بين 20 و3000 حرف';
  if (!form.category_id) return 'يرجى اختيار التصنيف';
  if (!form.city_id) return 'يرجى اختيار المدينة';
  if (price !== '' && (!Number.isFinite(Number(price)) || Number(price) < 0)) return 'السعر يجب أن يكون رقماً موجباً';
  if (price === '' && !form.is_negotiable) return 'أدخل السعر أو اختر "قابل للتفاوض"';
  if (phone && !PHONE_PATTERN.test(phone)) return 'رقم الهاتف غير صحيح';
  if (year !== '' && (!Number.isInteger(Number(year)) || Number(year) < 1950 || Number(year) > CURRENT_YEAR + 1)) {
    return 'سنة الصنع غير صحيحة';
  }
  if (mileage !== '' && (!Number.isInteger(Number(mileage)) || Number(mileage) < 0 || Number(mileage) > MAX_MILEAGE)) {
    return 'عدد الكيلومترات غير صحيح';
  }
  return null;
}

function orNull(value: string): string | null {
  const v = value.trim();
  return v === '' ? null : v;
}

function intOrNull(value: string): number | null {
  const v = toEnglishDigits(value).trim();
  return v === '' ? null : Number(v);
}

/** Column values shared by the create RPC and the owner's direct UPDATE. */
export function buildListingFields(form: ListingDraftForm, isCar: boolean) {
  const price = toEnglishDigits(form.price).trim();
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    ad_type: form.ad_type,
    category_id: form.category_id,
    city_id: form.city_id,
    price: price === '' ? null : Number(price),
    is_negotiable: form.is_negotiable,
    phone: toEnglishDigits(form.phone).trim(),
    car_make: isCar ? orNull(form.car_make) : null,
    car_model: isCar ? orNull(form.car_model) : null,
    fuel_type: isCar ? orNull(form.fuel_type) : null,
    transmission: isCar ? orNull(form.transmission) : null,
    year: isCar ? intOrNull(form.year) : null,
    mileage_km: isCar ? intOrNull(form.mileage_km) : null,
    color: isCar ? orNull(form.color) : null,
    condition: isCar ? orNull(form.condition) : null,
    body_type: isCar ? orNull(form.body_type) : null,
    customs_status: isCar ? orNull(form.customs_status) : null,
  };
}

export function buildCreateParams(form: ListingDraftForm, isCar: boolean, imageUrls: string[]) {
  const f = buildListingFields(form, isCar);
  return {
    p_title: f.title,
    p_description: f.description,
    p_ad_type: f.ad_type,
    p_category_id: f.category_id,
    p_city_id: f.city_id,
    p_price: f.price,
    p_is_negotiable: f.is_negotiable,
    p_phone: f.phone,
    p_car_make: f.car_make,
    p_car_model: f.car_model,
    p_fuel_type: f.fuel_type,
    p_transmission: f.transmission,
    p_year: f.year,
    p_mileage_km: f.mileage_km,
    p_image_urls: imageUrls,
    p_color: f.color,
    p_condition: f.condition,
    p_body_type: f.body_type,
    p_customs_status: f.customs_status,
  };
}
