export type Option = { value: string; label: string };

export const CAR_MAKES = [
  'تويوتا', 'هيونداي', 'كيا', 'نيسان', 'مرسيدس', 'بي ام دبليو', 'شيفرولية',
  'فورد', 'هوندا', 'ميتسوبيشي', 'سوزوكي', 'رينو', 'بيجو', 'فولكس واجن',
  'أوبل', 'سيات', 'فيات', 'لاند روفر', 'جيب', 'لكزس', 'أودي', 'مازدا',
  'سكودا', 'داسيا', 'ايسوزو', 'دايهاتسو', 'سوبارو', 'جيلي', 'شيري', 'إم جي',
  'هافال', 'دودج', 'كاديلاك', 'بورش', 'فولفو', 'انفينيتي', 'سيتروين', 'أخرى',
];

export const POPULAR_MAKES = [
  'تويوتا', 'هيونداي', 'كيا', 'نيسان', 'مرسيدس', 'بي ام دبليو',
  'شيفرولية', 'فورد', 'هوندا', 'ميتسوبيشي', 'سوزوكي', 'رينو',
];

export const FUEL_TYPES: Option[] = [
  { value: 'petrol', label: 'بنزين' },
  { value: 'diesel', label: 'ديزل' },
  { value: 'hybrid', label: 'هايبرد' },
  { value: 'electric', label: 'كهربائي' },
];

export const TRANSMISSION_TYPES: Option[] = [
  { value: 'automatic', label: 'أوتوماتيك' },
  { value: 'manual', label: 'عادي' },
];

export const CONDITIONS: Option[] = [
  { value: 'new', label: 'جديدة' },
  { value: 'used', label: 'مستعملة' },
];

export const CUSTOMS_STATUSES: Option[] = [
  { value: 'cleared', label: 'مجمركة' },
  { value: 'not_cleared', label: 'غير مجمركة' },
];

export const BODY_TYPES: Option[] = [
  { value: 'sedan', label: 'سيدان' },
  { value: 'suv', label: 'دفع رباعي (SUV)' },
  { value: 'hatchback', label: 'هاتشباك' },
  { value: 'pickup', label: 'بيك أب' },
  { value: 'coupe', label: 'كوبيه' },
  { value: 'van', label: 'فان / ميني باص' },
  { value: 'convertible', label: 'مكشوفة' },
  { value: 'other', label: 'أخرى' },
];

export const COLORS = [
  'أبيض', 'أسود', 'فضي', 'رمادي', 'أحمر', 'أزرق', 'أخضر',
  'بني', 'بيج', 'ذهبي', 'برتقالي', 'أصفر', 'أخرى',
];

export const REPORT_REASONS: Option[] = [
  { value: 'fraud', label: 'احتيال أو نصب' },
  { value: 'sold', label: 'السيارة بيعت ولم يُحدَّث الإعلان' },
  { value: 'wrong_info', label: 'معلومات أو صور غير صحيحة' },
  { value: 'duplicate', label: 'إعلان مكرر' },
  { value: 'inappropriate', label: 'محتوى غير لائق' },
  { value: 'other', label: 'سبب آخر' },
];

export const CAR_CATEGORY_SLUGS = ['cars-sale', 'cars-rent'];

export const CURRENT_YEAR = new Date().getFullYear();
export const MIN_YEAR = 1970;
export const MAX_MILEAGE = 2_000_000;

export function yearOptions(): number[] {
  const years: number[] = [];
  for (let y = CURRENT_YEAR + 1; y >= MIN_YEAR; y -= 1) years.push(y);
  return years;
}

export function labelOf(options: Option[], value: string | null | undefined): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? null;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-LY').format(value);
}

export function formatMileage(km: number | null | undefined): string | null {
  if (km === null || km === undefined) return null;
  return `${formatNumber(km)} كم`;
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });
  if (minutes < 60) return rtf.format(-Math.max(1, minutes), 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, 'day');
  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(-months, 'month');
  return rtf.format(-Math.round(months / 12), 'year');
}

export function isExpired(expiresAt: string | null | undefined): boolean {
  return Boolean(expiresAt) && new Date(expiresAt as string).getTime() <= Date.now();
}

export function daysLeft(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}
