export type SortOption = 'newest' | 'price_low' | 'price_high' | 'year_new' | 'km_low';

export type ListingFilters = {
  q: string;
  category: string;
  city: string;
  type: string;
  make: string;
  model: string;
  minPrice: string;
  maxPrice: string;
  minYear: string;
  maxYear: string;
  maxKm: string;
  fuel: string;
  trans: string;
  condition: string;
  customs: string;
  body: string;
  sort: SortOption;
};

export const PAGE_SIZE = 12;

export const emptyFilters: ListingFilters = {
  q: '', category: '', city: '', type: '', make: '', model: '',
  minPrice: '', maxPrice: '', minYear: '', maxYear: '', maxKm: '',
  fuel: '', trans: '', condition: '', customs: '', body: '', sort: 'newest',
};

const SORTS: SortOption[] = ['newest', 'price_low', 'price_high', 'year_new', 'km_low'];

const KEYS = Object.keys(emptyFilters) as (keyof ListingFilters)[];

export function parseFilters(params: URLSearchParams): ListingFilters {
  const next: ListingFilters = { ...emptyFilters };
  for (const key of KEYS) {
    const value = params.get(key);
    if (value !== null) (next as Record<string, string>)[key] = value.slice(0, 100);
  }
  if (!SORTS.includes(next.sort)) next.sort = 'newest';
  return next;
}

export function serializeFilters(filters: ListingFilters, page = 1): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = filters[key];
    if (value && !(key === 'sort' && value === 'newest')) params.set(key, value);
  }
  if (page > 1) params.set('page', String(page));
  return params;
}

export function parsePage(params: URLSearchParams): number {
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  return Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1;
}

export function countActiveFilters(filters: ListingFilters): number {
  return KEYS.filter((key) => key !== 'sort' && key !== 'q' && Boolean(filters[key])).length;
}

/**
 * Removes characters that have a special meaning inside a PostgREST `or()` filter or a
 * LIKE pattern, then splits the text into at most five words.
 */
export function searchWords(raw: string): string[] {
  return raw
    .replace(/[,()"'\\*%_:;]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0)
    .slice(0, 5);
}

export function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
