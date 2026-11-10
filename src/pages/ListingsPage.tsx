import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Car, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';

import { supabase, type City, type Listing, type ListingCategory } from '../lib/supabase';
import { ListingCard } from '../components/ListingCard';
import { ListingFilterPanel } from '../components/ListingFilterPanel';
import { Pagination } from '../components/Pagination';
import { AdSlot } from '../components/AdSlot';
import { useDocumentMeta, SITE_NAME } from '../lib/seo';
import { toEnglishDigits } from '../lib/contact';
import {
  BODY_TYPES, CONDITIONS, CUSTOMS_STATUSES, FUEL_TYPES, TRANSMISSION_TYPES, labelOf,
} from '../lib/carData';
import {
  PAGE_SIZE, countActiveFilters, emptyFilters, parseFilters, parsePage, searchWords,
  serializeFilters, toNumberOrNull, type ListingFilters, type SortOption,
} from '../lib/listingFilters';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'الأحدث',
  price_low: 'السعر: الأقل أولاً',
  price_high: 'السعر: الأعلى أولاً',
  year_new: 'الأحدث موديلاً',
  km_low: 'الأقل مسافة',
};

function chipLabels(filters: ListingFilters, categories: ListingCategory[]): { key: keyof ListingFilters; label: string }[] {
  const chips: { key: keyof ListingFilters; label: string }[] = [];
  const add = (key: keyof ListingFilters, label: string | null | undefined) => {
    if (label) chips.push({ key, label });
  };
  add('type', filters.type === 'sale' ? 'للبيع' : filters.type === 'rent' ? 'للإيجار' : null);
  add('category', categories.find((c) => c.slug === filters.category)?.name ?? (filters.category || null));
  add('city', filters.city);
  add('make', filters.make);
  add('model', filters.model ? `موديل: ${filters.model}` : null);
  add('minPrice', filters.minPrice ? `السعر من ${Number(filters.minPrice).toLocaleString('ar-LY')}` : null);
  add('maxPrice', filters.maxPrice ? `السعر إلى ${Number(filters.maxPrice).toLocaleString('ar-LY')}` : null);
  add('minYear', filters.minYear ? `من سنة ${filters.minYear}` : null);
  add('maxYear', filters.maxYear ? `إلى سنة ${filters.maxYear}` : null);
  add('maxKm', filters.maxKm ? `حتى ${Number(filters.maxKm).toLocaleString('ar-LY')} كم` : null);
  add('fuel', labelOf(FUEL_TYPES, filters.fuel));
  add('trans', labelOf(TRANSMISSION_TYPES, filters.trans));
  add('condition', labelOf(CONDITIONS, filters.condition));
  add('customs', labelOf(CUSTOMS_STATUSES, filters.customs));
  add('body', labelOf(BODY_TYPES, filters.body));
  return chips;
}

export function ListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const page = parsePage(searchParams);

  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState(filters.q);

  useEffect(() => setSearchText(filters.q), [filters.q]);

  useEffect(() => {
    Promise.all([
      supabase.from('listing_categories').select('*').order('sort_order'),
      supabase.from('cities').select('*').order('sort_order'),
    ]).then(([catRes, cityRes]) => {
      setCategories(catRes.data ?? []);
      setCities(cityRes.data ?? []);
    });
  }, []);

  const queryKey = searchParams.toString();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);

    const f = parseFilters(new URLSearchParams(queryKey));
    const currentPage = parsePage(new URLSearchParams(queryKey));

    let query = supabase
      .from('listings')
      .select(
        `*, listing_categories${f.category ? '!inner' : ''}(*), cities${f.city ? '!inner' : ''}(*)`,
        { count: 'exact' },
      )
      .eq('status', 'approved')
      .eq('is_sold', false)
      .gt('expires_at', new Date().toISOString());

    if (f.category) query = query.eq('listing_categories.slug', f.category);
    if (f.city) query = query.eq('cities.name', f.city);
    if (f.type === 'sale' || f.type === 'rent') query = query.eq('ad_type', f.type);
    if (f.make) query = query.eq('car_make', f.make);

    const model = searchWords(f.model).join(' ');
    if (model) query = query.ilike('car_model', `%${model}%`);

    const minPrice = toNumberOrNull(toEnglishDigits(f.minPrice));
    const maxPrice = toNumberOrNull(toEnglishDigits(f.maxPrice));
    const minYear = toNumberOrNull(f.minYear);
    const maxYear = toNumberOrNull(f.maxYear);
    const maxKm = toNumberOrNull(f.maxKm);
    if (minPrice !== null) query = query.gte('price', minPrice);
    if (maxPrice !== null) query = query.lte('price', maxPrice);
    if (minYear !== null) query = query.gte('year', minYear);
    if (maxYear !== null) query = query.lte('year', maxYear);
    if (maxKm !== null) query = query.lte('mileage_km', maxKm);

    if (f.fuel) query = query.eq('fuel_type', f.fuel);
    if (f.trans) query = query.eq('transmission', f.trans);
    if (f.condition) query = query.eq('condition', f.condition);
    if (f.customs) query = query.eq('customs_status', f.customs);
    if (f.body) query = query.eq('body_type', f.body);

    // Every search word must appear in the title, description, make or model.
    for (const word of searchWords(f.q)) {
      query = query.or(
        `title.ilike.%${word}%,description.ilike.%${word}%,car_make.ilike.%${word}%,car_model.ilike.%${word}%`,
      );
    }

    switch (f.sort) {
      case 'price_low':
        query = query.order('price', { ascending: true, nullsFirst: false });
        break;
      case 'price_high':
        query = query.order('price', { ascending: false, nullsFirst: false });
        break;
      case 'year_new':
        query = query.order('year', { ascending: false, nullsFirst: false });
        break;
      case 'km_low':
        query = query.order('mileage_km', { ascending: true, nullsFirst: false });
        break;
      default:
        break;
    }
    query = query.order('created_at', { ascending: false });

    const from = (currentPage - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    Promise.resolve(query).then(({ data, error, count }) => {
      if (!active) return;
      if (error) {
        console.error('listings query failed', error);
        setFailed(true);
        setListings([]);
        setTotal(0);
      } else {
        setListings((data ?? []) as unknown as Listing[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [queryKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const chips = useMemo(() => chipLabels(filters, categories), [filters, categories]);
  const activeCount = countActiveFilters(filters);

  const applyFilters = (next: ListingFilters, nextPage = 1) => {
    setSearchParams(serializeFilters(next, nextPage));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeChip = (key: keyof ListingFilters) => applyFilters({ ...filters, [key]: emptyFilters[key] });

  const heading = useMemo(() => {
    const kind = filters.type === 'rent' ? 'سيارات للإيجار' : filters.type === 'sale' ? 'سيارات للبيع' : 'سيارات';
    const make = filters.make ? ` ${filters.make}` : '';
    const city = filters.city ? ` في ${filters.city}` : '';
    return `${kind}${make}${city}`;
  }, [filters.type, filters.make, filters.city]);

  // Only the main landing-page filters are indexed; deeper combinations are noindex.
  const indexable = !filters.q && !filters.model && !filters.minPrice && !filters.maxPrice && !filters.minYear &&
    !filters.maxYear && !filters.maxKm && !filters.fuel && !filters.trans && !filters.condition &&
    !filters.customs && !filters.body && filters.sort === 'newest';
  const canonical = new URLSearchParams();
  (['category', 'city', 'type', 'make'] as const).forEach((key) => {
    if (filters[key]) canonical.set(key, filters[key]);
  });
  if (page > 1) canonical.set('page', String(page));
  const canonicalQuery = canonical.toString();

  useDocumentMeta({
    title: `${heading} | ${SITE_NAME}`,
    description: `تصفح ${heading} في ليبيا. أسعار وصور ومواصفات كاملة، وتواصل مباشر مع البائعين عبر الهاتف أو واتساب.`,
    path: `/listings${canonicalQuery ? `?${canonicalQuery}` : ''}`,
    noindex: !indexable,
  });

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    applyFilters({ ...filters, q: searchText.trim() });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">{heading}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {loading ? 'جاري التحميل...' : `${total.toLocaleString('ar-LY')} إعلان`}
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="hidden w-72 flex-shrink-0 lg:block">
          <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <ListingFilterPanel filters={filters} categories={categories} cities={cities} onApply={(f) => applyFilters(f)} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <form onSubmit={submitSearch} className="relative flex-1">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="ابحث: ماركة، موديل، كلمة من الوصف..."
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-12 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                aria-label="بحث"
              />
            </form>
            <div className="flex gap-3">
              <select
                value={filters.sort}
                onChange={(e) => applyFilters({ ...filters, sort: e.target.value as SortOption })}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-primary-500 sm:flex-none"
                aria-label="ترتيب النتائج"
              >
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <option key={key} value={key}>{SORT_LABELS[key]}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="relative flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                تصفية
                {activeCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[11px] text-white">{activeCount}</span>
                )}
              </button>
            </div>
          </div>

          {(chips.length > 0 || filters.q) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {filters.q && (
                <button type="button" onClick={() => removeChip('q')} className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
                  بحث: {filters.q}
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeChip(chip.key)}
                  className="flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                >
                  {chip.label}
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
              <button type="button" onClick={() => applyFilters(emptyFilters)} className="text-xs font-semibold text-gray-500 underline hover:text-gray-700">
                مسح الكل
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
          ) : failed ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-10 text-center text-red-700">
              تعذر تحميل الإعلانات. تحقق من اتصالك ثم أعد المحاولة.
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
              <Car className="mx-auto mb-4 h-14 w-14 text-gray-300" />
              <p className="mb-1 font-bold text-gray-700">لا توجد نتائج مطابقة</p>
              <p className="mb-5 text-sm text-gray-500">جرّب تقليل عدد عوامل التصفية أو تغيير كلمات البحث.</p>
              <button type="button" onClick={() => applyFilters(emptyFilters)} className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700">
                عرض كل الإعلانات
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((listing, index) => (
                  <ListingCard key={listing.id} listing={listing} priority={index < 3} />
                ))}
              </div>
              <AdSlot className="mt-8" />
              <Pagination page={page} totalPages={totalPages} onChange={(p) => applyFilters(filters, p)} />
            </>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => setShowFilters(false)} />
          <div className="relative mr-auto flex h-full w-[90%] max-w-sm flex-col bg-white p-5 shadow-2xl animate-fade-in">
            <ListingFilterPanel
              filters={filters}
              categories={categories}
              cities={cities}
              onApply={(f) => applyFilters(f)}
              onClose={() => setShowFilters(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
