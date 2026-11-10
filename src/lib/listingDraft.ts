export const LISTING_AUTH_RETURN_KEY = 'pending-listing-auth-return';

const DRAFT_KEY_PREFIX = 'pending-listing-draft';
const LEGACY_DRAFT_KEY = 'pending-listing-draft';
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type ListingDraftForm = {
  title: string;
  description: string;
  price: string;
  is_negotiable: boolean;
  category_id: string;
  city_id: string;
  ad_type: string;
  phone: string;
  car_make: string;
  car_model: string;
  fuel_type: string;
  transmission: string;
  year: string;
  mileage_km: string;
  color: string;
  condition: string;
  body_type: string;
  customs_status: string;
};

export const emptyListingForm: ListingDraftForm = {
  title: '', description: '', price: '', is_negotiable: false, category_id: '', city_id: '', ad_type: 'sale', phone: '',
  car_make: '', car_model: '', fuel_type: '', transmission: '',
  year: '', mileage_km: '', color: '', condition: '', body_type: '', customs_status: '',
};

type StoredDraft = {
  form: Partial<ListingDraftForm>;
  imageUrls: string[];
  savedAt: number;
};

export type ListingDraft = {
  form: ListingDraftForm;
  imageUrls: string[];
};

function draftKey(userId: string | null): string {
  return `${DRAFT_KEY_PREFIX}:${userId ?? 'guest'}`;
}

export function hasDraftContent(form: ListingDraftForm, imageUrls: string[]): boolean {
  return imageUrls.length > 0 || JSON.stringify(form) !== JSON.stringify(emptyListingForm);
}

function adoptGuestDraft(userId: string) {
  const guestRaw = window.localStorage.getItem(draftKey(null));
  if (!guestRaw || window.localStorage.getItem(draftKey(userId))) return;
  window.localStorage.setItem(draftKey(userId), guestRaw);
  window.localStorage.removeItem(draftKey(null));
}

function parseStoredDraft(raw: string): StoredDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (!parsed || typeof parsed !== 'object' || !parsed.form || typeof parsed.form !== 'object') return null;
    if (!Array.isArray(parsed.imageUrls) || typeof parsed.savedAt !== 'number') return null;
    return { form: parsed.form, imageUrls: parsed.imageUrls.filter((u): u is string => typeof u === 'string'), savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function loadListingDraft(userId: string | null): { draft: ListingDraft | null; expiredImageUrls: string[] } {
  window.localStorage.removeItem(LEGACY_DRAFT_KEY);
  if (userId) adoptGuestDraft(userId);

  const key = draftKey(userId);
  const raw = window.localStorage.getItem(key);
  if (!raw) return { draft: null, expiredImageUrls: [] };

  const stored = parseStoredDraft(raw);
  if (!stored) {
    window.localStorage.removeItem(key);
    return { draft: null, expiredImageUrls: [] };
  }
  if (Date.now() - stored.savedAt > DRAFT_MAX_AGE_MS) {
    window.localStorage.removeItem(key);
    return { draft: null, expiredImageUrls: stored.imageUrls };
  }

  return { draft: { form: { ...emptyListingForm, ...stored.form }, imageUrls: stored.imageUrls }, expiredImageUrls: [] };
}

export function saveListingDraft(userId: string | null, form: ListingDraftForm, imageUrls: string[]) {
  const stored: StoredDraft = { form, imageUrls, savedAt: Date.now() };
  window.localStorage.setItem(draftKey(userId), JSON.stringify(stored));
}

export function clearListingDraft(userId: string | null) {
  window.localStorage.removeItem(draftKey(userId));
}
