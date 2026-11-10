import { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import type { City, ListingCategory } from '../lib/supabase';
import {
  BODY_TYPES, CAR_MAKES, CONDITIONS, CUSTOMS_STATUSES, FUEL_TYPES, TRANSMISSION_TYPES, yearOptions,
} from '../lib/carData';
import { emptyFilters, type ListingFilters } from '../lib/listingFilters';
import { toEnglishDigits } from '../lib/contact';

type Props = {
  filters: ListingFilters;
  categories: ListingCategory[];
  cities: City[];
  onApply: (filters: ListingFilters) => void;
  onClose?: () => void;
};

const field =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

const MILEAGE_LIMITS = [
  { value: '20000', label: 'حتى 20,000 كم' },
  { value: '50000', label: 'حتى 50,000 كم' },
  { value: '100000', label: 'حتى 100,000 كم' },
  { value: '150000', label: 'حتى 150,000 كم' },
  { value: '200000', label: 'حتى 200,000 كم' },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-gray-700">{title}</p>
      {children}
    </div>
  );
}

export function ListingFilterPanel({ filters, categories, cities, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<ListingFilters>(filters);

  useEffect(() => setDraft(filters), [filters]);

  const set = <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const numeric = (key: 'minPrice' | 'maxPrice') => (value: string) =>
    set(key, toEnglishDigits(value).replace(/[^\d]/g, ''));

  const years = yearOptions();

  const apply = () => {
    onApply(draft);
    onClose?.();
  };

  const reset = () => {
    const cleared = { ...emptyFilters, q: draft.q, sort: draft.sort };
    setDraft(cleared);
    onApply(cleared);
    onClose?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">تصفية النتائج</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={reset} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100">
            <RotateCcw className="h-4 w-4" />
            مسح
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="إغلاق">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4">
        <Group title="نوع الإعلان">
          <div className="grid grid-cols-3 gap-2">
            {[{ value: '', label: 'الكل' }, { value: 'sale', label: 'بيع' }, { value: 'rent', label: 'إيجار' }].map((o) => (
              <button
                key={o.value || 'all'}
                type="button"
                onClick={() => set('type', o.value)}
                className={`rounded-xl border py-2 text-sm font-semibold transition-colors ${
                  draft.type === o.value ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Group>

        <Group title="التصنيف">
          <select value={draft.category} onChange={(e) => set('category', e.target.value)} className={field}>
            <option value="">كل التصنيفات</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </Group>

        <Group title="المدينة">
          <select value={draft.city} onChange={(e) => set('city', e.target.value)} className={field}>
            <option value="">كل المدن</option>
            {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </Group>

        <Group title="الماركة والموديل">
          <div className="space-y-2">
            <select value={draft.make} onChange={(e) => set('make', e.target.value)} className={field}>
              <option value="">كل الماركات</option>
              {CAR_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input value={draft.model} onChange={(e) => set('model', e.target.value)} maxLength={40} placeholder="الموديل (مثال: كورولا)" className={field} />
          </div>
        </Group>

        <Group title="السعر (د.ل)">
          <div className="grid grid-cols-2 gap-2">
            <input value={draft.minPrice} onChange={(e) => numeric('minPrice')(e.target.value)} inputMode="numeric" placeholder="من" className={field} />
            <input value={draft.maxPrice} onChange={(e) => numeric('maxPrice')(e.target.value)} inputMode="numeric" placeholder="إلى" className={field} />
          </div>
        </Group>

        <Group title="سنة الصنع">
          <div className="grid grid-cols-2 gap-2">
            <select value={draft.minYear} onChange={(e) => set('minYear', e.target.value)} className={field}>
              <option value="">من</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={draft.maxYear} onChange={(e) => set('maxYear', e.target.value)} className={field}>
              <option value="">إلى</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </Group>

        <Group title="المسافة المقطوعة">
          <select value={draft.maxKm} onChange={(e) => set('maxKm', e.target.value)} className={field}>
            <option value="">أي مسافة</option>
            {MILEAGE_LIMITS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Group>

        <Group title="الوقود">
          <select value={draft.fuel} onChange={(e) => set('fuel', e.target.value)} className={field}>
            <option value="">الكل</option>
            {FUEL_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Group>

        <Group title="ناقل الحركة">
          <select value={draft.trans} onChange={(e) => set('trans', e.target.value)} className={field}>
            <option value="">الكل</option>
            {TRANSMISSION_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Group>

        <Group title="الحالة">
          <select value={draft.condition} onChange={(e) => set('condition', e.target.value)} className={field}>
            <option value="">الكل</option>
            {CONDITIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Group>

        <Group title="الجمرك">
          <select value={draft.customs} onChange={(e) => set('customs', e.target.value)} className={field}>
            <option value="">الكل</option>
            {CUSTOMS_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Group>

        <Group title="نوع الهيكل">
          <select value={draft.body} onChange={(e) => set('body', e.target.value)} className={field}>
            <option value="">الكل</option>
            {BODY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Group>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <button type="button" onClick={apply} className="w-full rounded-xl bg-primary-600 py-3 font-bold text-white transition-colors hover:bg-primary-700">
          عرض النتائج
        </button>
      </div>
    </div>
  );
}
