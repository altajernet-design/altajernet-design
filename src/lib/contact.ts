const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';

/** Converts Arabic-Indic digits to ASCII so numbers typed on an Arabic keyboard are accepted. */
export function toEnglishDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EXTENDED_ARABIC_INDIC.indexOf(d)));
}

/** Returns the phone in international digits (no "+"), e.g. 218912345678, or null when invalid. */
export function toInternationalPhone(raw: string): string | null {
  let digits = toEnglishDigits(raw).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);

  if (digits.startsWith('218')) {
    // already international
  } else if (digits.startsWith('0')) {
    digits = `218${digits.slice(1)}`;
  } else if (/^9\d{8}$/.test(digits)) {
    digits = `218${digits}`;
  }

  return /^\d{9,15}$/.test(digits) ? digits : null;
}

export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null;
  const international = toInternationalPhone(phone);
  if (!international) return null;
  return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string): string {
  return `tel:${toEnglishDigits(phone).replace(/[^\d+]/g, '')}`;
}

export const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidContact(value: string): boolean {
  const v = toEnglishDigits(value).trim();
  return PHONE_PATTERN.test(v) || EMAIL_PATTERN.test(v);
}
