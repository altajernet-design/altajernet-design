import { type ChangeEvent } from 'react';
import { Camera, Loader2, Star, X } from 'lucide-react';
import type { City, ListingCategory } from '../lib/supabase';
import type { ListingDraftForm } from '../lib/listingDraft';
import { MAX_LISTING_IMAGES } from '../lib/listingImages';
import {
  BODY_TYPES, CAR_MAKES, COLORS, CONDITIONS, CUSTOMS_STATUSES, FUEL_TYPES,
  TRANSMISSION_TYPES, yearOptions,
} from '../lib/carData';
import { isCarCategory } from '../lib/listingValidation';

type FieldChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;

type Props = {
  form: ListingDraftForm;
  onChange: FieldChange;
  setField: (name: keyof ListingDraftForm, value: string) => void;
  categories: ListingCategory[];
  cities: City[];
  imageUrls: string[];
  uploading: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (url: string) => void;
  onMakeCover: (url: string) => void;
};

const field =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-100';
const labelClass = 'mb-2 block text-sm font-semibold text-gray-700';

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
      {hint && <p className="mb-4 mt-1 text-sm text-gray-500">{hint}</p>}
      {!hint && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Chips({
  name, value, options, onPick,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={`${name}-${option.value}`}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onPick(active ? '' : option.value)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              active ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ListingFormFields({
  form, onChange, setField, categories, cities, imageUrls, uploading, onUpload, onRemoveImage, onMakeCover,
}: Props) {
  const isCar = isCarCategory(categories, form.category_id);

  const setValue = setField;

  return (
    <div className="space-y-5">
      <Section title="نوع الإعلان">
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'sale', label: 'للبيع' },
            { value: 'rent', label: 'للإيجار' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue('ad_type', option.value)}
              className={`rounded-xl border-2 py-3 font-bold transition-colors ${
                form.ad_type === option.value
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <label className={labelClass} htmlFor="category_id">التصنيف</label>
          <select id="category_id" name="category_id" value={form.category_id} onChange={onChange} className={field} required>
            <option value="">اختر التصنيف</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="الصور" hint={`أضف حتى ${MAX_LISTING_IMAGES} صور واضحة (JPG أو PNG أو WebP، حتى 5 ميجابايت للصورة). الصورة الأولى هي الغلاف.`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {imageUrls.map((url, index) => (
            <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <img src={url} alt={`صورة ${index + 1}`} className="h-full w-full object-cover" />
              {index === 0 && (
                <span className="absolute right-2 top-2 rounded-md bg-primary-600 px-2 py-0.5 text-[11px] font-bold text-white">الغلاف</span>
              )}
              <button
                type="button"
                onClick={() => onRemoveImage(url)}
                className="absolute left-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                aria-label="حذف الصورة"
              >
                <X className="h-4 w-4" />
              </button>
              {index !== 0 && (
                <button
                  type="button"
                  onClick={() => onMakeCover(url)}
                  className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-gray-700 opacity-100 shadow-sm hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Star className="h-3 w-3" />
                  اجعلها الغلاف
                </button>
              )}
            </div>
          ))}

          {imageUrls.length < MAX_LISTING_IMAGES && (
            <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 transition-colors hover:border-primary-400 hover:bg-primary-50">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              <span className="text-xs font-semibold">{uploading ? 'جاري الرفع...' : 'إضافة صور'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onUpload} className="hidden" disabled={uploading} />
            </label>
          )}
        </div>
      </Section>

      <Section title="تفاصيل الإعلان">
        <div className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="title">عنوان الإعلان</label>
            <input
              id="title" name="title" value={form.title} onChange={onChange} required minLength={5} maxLength={100}
              placeholder="مثال: تويوتا كورولا 2018 نظيفة جداً" className={field}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="description">الوصف</label>
            <textarea
              id="description" name="description" value={form.description} onChange={onChange} required minLength={20}
              maxLength={3000} rows={6} className={`${field} resize-none`}
              placeholder="اذكر حالة السيارة، الصيانة، الأعطال إن وجدت، سبب البيع، وأي إضافات..."
            />
            <p className="mt-1 text-left text-xs text-gray-400">{form.description.length} / 3000</p>
          </div>
        </div>
      </Section>

      {isCar && (
        <Section title="مواصفات السيارة" hint="كلما كانت المواصفات أدق، وصلت إلى المشترين المناسبين أسرع.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="car_make">الماركة</label>
              <select id="car_make" name="car_make" value={form.car_make} onChange={onChange} className={field}>
                <option value="">اختر الماركة</option>
                {CAR_MAKES.map((make) => <option key={make} value={make}>{make}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="car_model">الموديل</label>
              <input id="car_model" name="car_model" value={form.car_model} onChange={onChange} maxLength={60} placeholder="مثال: كورولا" className={field} />
            </div>
            <div>
              <label className={labelClass} htmlFor="year">سنة الصنع</label>
              <select id="year" name="year" value={form.year} onChange={onChange} className={field}>
                <option value="">اختر السنة</option>
                {yearOptions().map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="mileage_km">المسافة المقطوعة (كم)</label>
              <input
                id="mileage_km" name="mileage_km" value={form.mileage_km} onChange={onChange} inputMode="numeric"
                placeholder="مثال: 120000" className={field}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="color">اللون</label>
              <select id="color" name="color" value={form.color} onChange={onChange} className={field}>
                <option value="">اختر اللون</option>
                {COLORS.map((color) => <option key={color} value={color}>{color}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="body_type">نوع الهيكل</label>
              <select id="body_type" name="body_type" value={form.body_type} onChange={onChange} className={field}>
                <option value="">اختر النوع</option>
                {BODY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <span className={labelClass}>الوقود</span>
              <Chips name="fuel" value={form.fuel_type} options={FUEL_TYPES} onPick={(v) => setValue('fuel_type', v)} />
            </div>
            <div>
              <span className={labelClass}>ناقل الحركة</span>
              <Chips name="trans" value={form.transmission} options={TRANSMISSION_TYPES} onPick={(v) => setValue('transmission', v)} />
            </div>
            <div>
              <span className={labelClass}>الحالة</span>
              <Chips name="condition" value={form.condition} options={CONDITIONS} onPick={(v) => setValue('condition', v)} />
            </div>
            <div>
              <span className={labelClass}>الجمرك</span>
              <Chips name="customs" value={form.customs_status} options={CUSTOMS_STATUSES} onPick={(v) => setValue('customs_status', v)} />
            </div>
          </div>
        </Section>
      )}

      <Section title="السعر والتواصل">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="city_id">المدينة</label>
            <select id="city_id" name="city_id" value={form.city_id} onChange={onChange} className={field} required>
              <option value="">اختر المدينة</option>
              {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="phone">رقم الهاتف / واتساب</label>
            <input
              id="phone" name="phone" value={form.phone} onChange={onChange} type="tel" dir="ltr" maxLength={20}
              placeholder="09XXXXXXXX" className={`${field} text-left`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="price">السعر (د.ل)</label>
            <input
              id="price" name="price" value={form.price} onChange={onChange} inputMode="decimal"
              placeholder="مثال: 45000" className={field}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
            <input
              type="checkbox" name="is_negotiable" checked={form.is_negotiable} onChange={onChange}
              className="h-4 w-4 accent-primary-600"
            />
            السعر قابل للتفاوض
          </label>
        </div>
      </Section>
    </div>
  );
}
