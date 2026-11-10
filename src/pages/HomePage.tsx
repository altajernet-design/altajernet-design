import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, Camera, MapPin, MessageCircle, Search, ShieldCheck } from 'lucide-react';
import { supabase, type City, type Listing, type ListingCategory } from '../lib/supabase';
import { ListingCategoryCard } from '../components/ListingCategoryCard';
import { ListingCard } from '../components/ListingCard';
import { AdSlot } from '../components/AdSlot';
import { CAR_MAKES, POPULAR_MAKES } from '../lib/carData';
import { SITE_NAME, SITE_URL, useDocumentMeta } from '../lib/seo';
import { serializeFilters, emptyFilters } from '../lib/listingFilters';

const selectClass =
  'h-12 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

export function HomePage() {
  useDocumentMeta({
    title: `${SITE_NAME} - إعلانات السيارات للبيع والإيجار في ليبيا`,
    description: 'تصفح سيارات للبيع والإيجار في طرابلس وبنغازي ومصراتة وكل المدن الليبية. أسعار وصور ومواصفات، وتواصل مباشر مع البائعين.',
    path: '/',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: 'ar',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/listings?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/favicon-192.png`,
      },
    ],
  });

  const navigate = useNavigate();
  const [listingCategories, setListingCategories] = useState<ListingCategory[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [make, setMake] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('listing_categories').select('*').order('sort_order'),
      supabase.from('cities').select('*').order('sort_order'),
      supabase
        .from('listings')
        .select('*, listing_categories(*), cities(*)')
        .eq('status', 'approved')
        .eq('is_sold', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(8),
    ]).then(([lcatRes, cityRes, lstRes]) => {
      setListingCategories(lcatRes.data ?? []);
      setCities(cityRes.data ?? []);
      setListings((lstRes.data ?? []) as Listing[]);
      setLoading(false);
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = serializeFilters({ ...emptyFilters, q: search.trim(), make, city });
    navigate(`/listings${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const steps = [
    { icon: Camera, title: 'انشر إعلانك مجاناً', text: 'أضف صور السيارة ومواصفاتها وسعرها في دقائق.' },
    { icon: ShieldCheck, title: 'مراجعة قبل النشر', text: 'يراجع فريقنا كل إعلان للحد من الإعلانات المضللة.' },
    { icon: MessageCircle, title: 'تواصل مباشر', text: 'يصلك المشترون عبر الاتصال أو واتساب أو الرسائل.' },
  ];

  return (
    <div>
      <section className="relative overflow-hidden bg-primary-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-900 to-primary-900" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-12 sm:px-6 md:pb-20 md:pt-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 text-3xl font-extrabold leading-tight md:text-5xl">
              ابحث عن سيارتك في ليبيا
              <br />
              <span className="text-accent-400">أو اعرض سيارتك للبيع</span>
            </h1>
            <p className="mb-8 text-base leading-relaxed text-primary-100 md:text-lg">
              سيارات للبيع والإيجار في كل المدن الليبية، مع صور حقيقية وأسعار بالدينار الليبي.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mx-auto max-w-4xl rounded-2xl bg-white p-3 shadow-xl">
            <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ماركة، موديل، كلمة..."
                  className="h-12 w-full rounded-xl border border-gray-200 pl-3 pr-10 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  aria-label="بحث"
                />
              </div>
              <select value={make} onChange={(e) => setMake(e.target.value)} className={selectClass} aria-label="الماركة">
                <option value="">كل الماركات</option>
                {CAR_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={city} onChange={(e) => setCity(e.target.value)} className={selectClass} aria-label="المدينة">
                <option value="">كل المدن</option>
                {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <button type="submit" className="h-12 whitespace-nowrap rounded-xl bg-accent-500 px-8 text-sm font-bold text-white transition-colors hover:bg-accent-600">
                بحث
              </button>
            </div>
          </form>

          <div className="mx-auto mt-4 grid max-w-4xl grid-cols-2 gap-3">
            <Link to="/listings?category=cars-sale&type=sale" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20">
              <Car className="h-4 w-4" />سيارات للبيع
            </Link>
            <Link to="/listings?category=cars-rent&type=rent" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20">
              <Car className="h-4 w-4" />سيارات للإيجار
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900">تصفح حسب الماركة</h2>
        <ul className="flex flex-wrap gap-2">
          {POPULAR_MAKES.map((m) => (
            <li key={m}>
              <Link to={`/listings?make=${encodeURIComponent(m)}`} className="block rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700">
                {m}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">أحدث السيارات</h2>
            <p className="mt-1 text-sm text-gray-500">إعلانات مضافة حديثاً</p>
          </div>
          <Link to="/listings" className="flex items-center gap-1 text-sm font-semibold text-primary-700 transition-all hover:gap-2">
            عرض الكل<ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-full rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {listings.map((l, index) => <ListingCard key={l.id} listing={l} variant="home" priority={index < 4} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center">
            <Car className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-gray-500">لا توجد إعلانات بعد</p>
            <Link to="/post-listing" className="mt-4 inline-block rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700">أضف أول إعلان</Link>
          </div>
        )}
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8"><AdSlot /></div>

      {listingCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <h2 className="mb-1 text-2xl font-bold text-gray-900">تصفح حسب التصنيف</h2>
          <p className="mb-6 text-sm text-gray-500">اختر التصنيف الذي يناسب احتياجك</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {listingCategories.map((cat) => <ListingCategoryCard key={cat.id} category={cat} />)}
          </div>
        </section>
      )}

      {cities.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-xl font-bold text-gray-900">سيارات حسب المدينة</h2>
          <ul className="flex flex-wrap gap-2">
            {cities.slice(0, 16).map((c) => (
              <li key={c.id}>
                <Link to={`/listings?city=${encodeURIComponent(c.name)}`} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700">
                  <MapPin className="h-3.5 w-3.5" />{c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">كيف يعمل الموقع؟</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-6">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><Icon className="h-6 w-6" /></span>
              <h3 className="mb-1 font-bold text-gray-900">{title}</h3>
              <p className="text-sm leading-7 text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm md:p-12">
          <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">هل لديك سيارة تبيعها أو تؤجرها؟</h2>
          <p className="mx-auto mb-8 max-w-xl leading-relaxed text-gray-600">
            انشر إعلان سيارتك على سوق السيارات الليبي وتواصل مع المهتمين في مختلف المدن الليبية.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/post-listing" className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-8 py-3 font-bold text-white transition-colors hover:bg-accent-600">
              أضف إعلانك الآن<ArrowLeft className="h-5 w-5" />
            </Link>
            <Link to="/signup" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-8 py-3 font-bold text-gray-800 transition-colors hover:border-primary-300 hover:text-primary-700">
              إنشاء حساب
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
