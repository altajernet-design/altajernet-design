import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, Calendar, Car, ChevronLeft, ChevronRight, Clock, Eye, Flag, Fuel, Gauge, Loader2,
  MapPin, MessageCircle, Palette, Phone, Settings, ShieldCheck, ShieldAlert, Tag, Truck, User, Maximize2,
} from 'lucide-react';

import { supabase, type Listing } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { getPriceDisplay } from '../lib/listingPrice';
import { SITE_NAME, SITE_URL, truncate, useDocumentMeta } from '../lib/seo';
import {
  BODY_TYPES, CONDITIONS, CUSTOMS_STATUSES, FUEL_TYPES, TRANSMISSION_TYPES,
  formatMileage, isExpired, labelOf, timeAgo,
} from '../lib/carData';
import { telLink, whatsappLink } from '../lib/contact';
import { ListingCard } from '../components/ListingCard';
import { ShareButtons } from '../components/ShareButtons';
import { FavoriteButton } from '../components/FavoriteButton';
import { ImageLightbox } from '../components/ImageLightbox';
import { MessageSellerModal } from '../components/MessageSellerModal';
import { ReportListingModal } from '../components/ReportListingModal';
import { AdSlot } from '../components/AdSlot';

type Spec = { icon: typeof Car; label: string; value: string };

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setListing(null);
    setSimilar([]);
    setActiveImage(0);
    setShowPhone(false);

    Promise.resolve(
      supabase
        .from('listings')
        .select('*, listing_categories(*), cities(*), listing_images(*)')
        .eq('id', id)
        .maybeSingle(),
    ).then(({ data }) => {
      if (!active) return;
      setListing((data as Listing | null) ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [id]);

  const images = useMemo(() => {
    if (!listing) return [];
    const fromTable = [...(listing.listing_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => image.image_url);
    if (fromTable.length > 0) return fromTable;
    return listing.image_url ? [listing.image_url] : [];
  }, [listing]);

  const isOwner = Boolean(user && listing && user.id === listing.user_id);
  const expired = listing ? isExpired(listing.expires_at) : false;
  const isLive = Boolean(listing && listing.status === 'approved' && !listing.is_sold && !expired);

  // Count a view once per browser session, and never the owner's own visits.
  useEffect(() => {
    if (!listing || listing.status !== 'approved' || isOwner) return;
    const key = `viewed-${listing.id}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {
      return;
    }
    void Promise.resolve(supabase.rpc('increment_listing_views', { p_listing_id: listing.id }));
  }, [listing, isOwner]);

  // Similar listings: same make when known, otherwise the same category.
  useEffect(() => {
    if (!listing || !isLive) return;
    let active = true;
    let query = supabase
      .from('listings')
      .select('*, listing_categories(*), cities(*)')
      .eq('status', 'approved')
      .eq('is_sold', false)
      .gt('expires_at', new Date().toISOString())
      .neq('id', listing.id)
      .order('created_at', { ascending: false })
      .limit(4);
    if (listing.car_make) query = query.eq('car_make', listing.car_make);
    else if (listing.category_id) query = query.eq('category_id', listing.category_id);

    Promise.resolve(query).then(({ data }) => {
      if (active) setSimilar((data ?? []) as Listing[]);
    });
    return () => {
      active = false;
    };
  }, [listing, isLive]);

  const price = listing ? getPriceDisplay(listing.price, listing.is_negotiable) : null;
  const makeModel = listing ? [listing.car_make, listing.car_model, listing.year].filter(Boolean).join(' ') : '';
  const path = id ? `/listing/${id}` : '/listings';

  const jsonLd = useMemo(() => {
    if (!listing || !isLive) return undefined;
    const isCarListing = Boolean(listing.car_make || listing.year);
    const base: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': isCarListing ? 'Car' : 'Product',
      name: listing.title,
      description: truncate(listing.description, 300),
      image: images.length > 0 ? images : undefined,
      url: `${SITE_URL}/listing/${listing.id}`,
    };
    if (isCarListing) {
      base.brand = listing.car_make ? { '@type': 'Brand', name: listing.car_make } : undefined;
      base.model = listing.car_model ?? undefined;
      base.vehicleModelDate = listing.year ? String(listing.year) : undefined;
      base.color = listing.color ?? undefined;
      base.fuelType = labelOf(FUEL_TYPES, listing.fuel_type) ?? undefined;
      base.vehicleTransmission = labelOf(TRANSMISSION_TYPES, listing.transmission) ?? undefined;
      base.bodyType = labelOf(BODY_TYPES, listing.body_type) ?? undefined;
      base.itemCondition = listing.condition === 'new'
        ? 'https://schema.org/NewCondition'
        : listing.condition === 'used' ? 'https://schema.org/UsedCondition' : undefined;
      base.mileageFromOdometer = listing.mileage_km !== null
        ? { '@type': 'QuantitativeValue', value: listing.mileage_km, unitCode: 'KMT' }
        : undefined;
    }
    if (listing.price && listing.price > 0) {
      base.offers = {
        '@type': 'Offer',
        price: listing.price,
        priceCurrency: 'LYD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/listing/${listing.id}`,
        areaServed: listing.cities?.name,
      };
    }
    return base;
  }, [listing, isLive, images]);

  useDocumentMeta({
    title: listing
      ? `${listing.title}${listing.cities?.name ? ` - ${listing.cities.name}` : ''} | ${SITE_NAME}`
      : `الإعلان | ${SITE_NAME}`,
    description: listing
      ? truncate(
          `${listing.ad_type === 'rent' ? 'للإيجار' : 'للبيع'}: ${makeModel || listing.title}${
            listing.cities?.name ? ` في ${listing.cities.name}` : ''
          }${price?.amount ? ` بسعر ${price.amount} د.ل` : ''}. ${listing.description}`,
          155,
        )
      : 'تفاصيل إعلان سيارة على سوق السيارات الليبي.',
    path,
    image: images[0],
    jsonLd,
    noindex: !isLive,
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Car className="mx-auto mb-4 h-16 w-16 text-gray-300" />
        <h1 className="mb-2 text-2xl font-bold text-gray-800">الإعلان غير موجود</h1>
        <p className="mb-6 text-gray-500">ربما حُذف الإعلان أو لم تتم الموافقة عليه بعد.</p>
        <Link to="/listings" className="inline-block rounded-xl bg-primary-600 px-6 py-3 font-bold text-white hover:bg-primary-700">
          تصفح الإعلانات
        </Link>
      </div>
    );
  }

  const specs: Spec[] = [
    listing.car_make ? { icon: Car, label: 'الماركة', value: listing.car_make } : null,
    listing.car_model ? { icon: Tag, label: 'الموديل', value: listing.car_model } : null,
    listing.year ? { icon: Calendar, label: 'سنة الصنع', value: String(listing.year) } : null,
    formatMileage(listing.mileage_km) ? { icon: Gauge, label: 'المسافة', value: formatMileage(listing.mileage_km) as string } : null,
    labelOf(FUEL_TYPES, listing.fuel_type) ? { icon: Fuel, label: 'الوقود', value: labelOf(FUEL_TYPES, listing.fuel_type) as string } : null,
    labelOf(TRANSMISSION_TYPES, listing.transmission) ? { icon: Settings, label: 'ناقل الحركة', value: labelOf(TRANSMISSION_TYPES, listing.transmission) as string } : null,
    listing.color ? { icon: Palette, label: 'اللون', value: listing.color } : null,
    labelOf(BODY_TYPES, listing.body_type) ? { icon: Truck, label: 'نوع الهيكل', value: labelOf(BODY_TYPES, listing.body_type) as string } : null,
    labelOf(CONDITIONS, listing.condition) ? { icon: ShieldCheck, label: 'الحالة', value: labelOf(CONDITIONS, listing.condition) as string } : null,
    labelOf(CUSTOMS_STATUSES, listing.customs_status) ? { icon: ShieldCheck, label: 'الجمرك', value: labelOf(CUSTOMS_STATUSES, listing.customs_status) as string } : null,
  ].filter((spec): spec is Spec => spec !== null);

  const shareText = `مرحباً، أنا مهتم بإعلانك "${listing.title}" على ${SITE_NAME}: ${SITE_URL}/listing/${listing.id}`;
  const waLink = whatsappLink(listing.phone, shareText);
  const hasPhone = Boolean(listing.phone && listing.phone.trim());
  const canContact = isLive && !isOwner;

  const prevImage = () => setActiveImage((i) => (i - 1 + images.length) % images.length);
  const nextImage = () => setActiveImage((i) => (i + 1) % images.length);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-gray-500" aria-label="مسار التنقل">
        <Link to="/" className="hover:text-primary-600">الرئيسية</Link>
        <span>/</span>
        <Link to="/listings" className="hover:text-primary-600">الإعلانات</Link>
        {listing.car_make && (
          <>
            <span>/</span>
            <Link to={`/listings?make=${encodeURIComponent(listing.car_make)}`} className="hover:text-primary-600">{listing.car_make}</Link>
          </>
        )}
      </nav>

      {!isLive && (
        <div className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
          listing.status === 'approved' ? 'border-gray-300 bg-gray-100 text-gray-700' : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>
            {listing.status === 'pending' && 'هذا الإعلان قيد المراجعة ولن يظهر للزوار حتى تتم الموافقة عليه.'}
            {listing.status === 'rejected' && 'تم رفض هذا الإعلان. عدّله وأعد إرساله للمراجعة من لوحة التحكم.'}
            {listing.status === 'approved' && listing.is_sold && 'تم بيع هذه السيارة.'}
            {listing.status === 'approved' && !listing.is_sold && expired && 'انتهت مدة هذا الإعلان.'}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="relative aspect-[4/3] bg-gray-100 sm:aspect-[16/10]">
              {images.length > 0 ? (
                <button type="button" onClick={() => setLightbox(true)} className="block h-full w-full" aria-label="تكبير الصورة">
                  <img
                    src={images[activeImage]}
                    alt={`${listing.title} - صورة ${activeImage + 1}`}
                    className={`h-full w-full object-contain ${listing.is_sold ? 'opacity-70 grayscale' : ''}`}
                  />
                </button>
              ) : (
                <div className="flex h-full items-center justify-center"><Car className="h-20 w-20 text-gray-300" /></div>
              )}

              {images.length > 1 && (
                <>
                  <button type="button" onClick={prevImage} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white" aria-label="الصورة السابقة">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={nextImage} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white" aria-label="الصورة التالية">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </>
              )}
              {images.length > 0 && (
                <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  <Maximize2 className="h-3.5 w-3.5" />
                  {activeImage + 1} / {images.length}
                </span>
              )}
              {listing.is_sold && (
                <span className="absolute left-3 top-3 rounded-lg bg-gray-900/85 px-4 py-1.5 text-sm font-bold text-white">تم البيع</span>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {images.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 ${index === activeImage ? 'border-primary-600' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    aria-label={`عرض الصورة ${index + 1}`}
                  >
                    <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-lg px-3 py-1 text-xs font-bold text-white ${listing.ad_type === 'rent' ? 'bg-blue-600' : 'bg-primary-600'}`}>
                {listing.ad_type === 'rent' ? 'للإيجار' : 'للبيع'}
              </span>
              {listing.listing_categories?.name && (
                <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{listing.listing_categories.name}</span>
              )}
            </div>
            <h1 className="mb-3 text-2xl font-bold text-gray-900">{listing.title}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500">
              {listing.cities?.name && (
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{listing.cities.name}</span>
              )}
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{timeAgo(listing.created_at)}</span>
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{listing.views_count.toLocaleString('ar-LY')} مشاهدة</span>
            </div>
          </div>

          {specs.length > 0 && (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="specs-heading">
              <h2 id="specs-heading" className="mb-4 text-lg font-bold text-gray-800">مواصفات السيارة</h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {specs.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-xl bg-gray-50 p-3">
                    <dt className="mb-1 flex items-center gap-1.5 text-xs text-gray-500"><Icon className="h-3.5 w-3.5" />{label}</dt>
                    <dd className="font-bold text-gray-800">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-gray-800">الوصف</h2>
            <p className="whitespace-pre-line leading-8 text-gray-700">{listing.description}</p>
          </section>

          <AdSlot />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            {price?.amount ? (
              <p className="flex items-baseline gap-2 text-3xl font-extrabold text-accent-600">
                {price.amount}<span className="text-base font-semibold text-gray-400">{price.label}</span>
              </p>
            ) : (
              <p className="text-xl font-bold text-accent-600">{price?.label}</p>
            )}
            {price?.amount && listing.is_negotiable && <p className="mt-1 text-sm text-gray-500">السعر قابل للتفاوض</p>}

            {canContact && (
              <div className="mt-5 hidden space-y-3 lg:block">
                {hasPhone && (
                  showPhone ? (
                    <a href={telLink(listing.phone as string)} dir="ltr" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 font-bold text-white hover:bg-primary-700">
                      <Phone className="h-5 w-5" />{listing.phone}
                    </a>
                  ) : (
                    <button type="button" onClick={() => setShowPhone(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 font-bold text-white hover:bg-primary-700">
                      <Phone className="h-5 w-5" />إظهار رقم الهاتف
                    </button>
                  )
                )}
                {waLink && (
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 font-bold text-white hover:bg-green-600">
                    <MessageCircle className="h-5 w-5" />واتساب
                  </a>
                )}
                <button type="button" onClick={() => setShowMessage(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-accent-500 py-3 font-bold text-accent-600 hover:bg-accent-50">
                  <MessageCircle className="h-5 w-5" />راسل المعلن
                </button>
              </div>
            )}

            {isOwner && (
              <Link to={`/edit-listing/${listing.id}`} className="mt-5 block rounded-xl bg-primary-600 py-3 text-center font-bold text-white hover:bg-primary-700">
                تعديل الإعلان
              </Link>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
              <FavoriteButton listingId={listing.id} variant="inline" />
              <button type="button" onClick={() => setShowReport(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                <Flag className="h-4 w-4" />إبلاغ
              </button>
            </div>
            <div className="mt-4"><ShareButtons listingId={listing.id} title={listing.title} /></div>
          </div>

          <Link to={`/seller/${listing.user_id}`} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:border-primary-200">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50 text-primary-600"><User className="h-5 w-5" /></span>
            <span>
              <span className="block font-bold text-gray-800">المعلن</span>
              <span className="text-sm text-primary-600">عرض كل إعلاناته</span>
            </span>
          </Link>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="mb-2 flex items-center gap-2 font-bold"><ShieldAlert className="h-5 w-5" />نصائح للأمان</p>
            <ul className="list-disc space-y-1 pr-5 leading-6">
              <li>عاين السيارة بنفسك قبل أي دفع، ويفضّل اصطحاب ميكانيكي.</li>
              <li>لا تحوّل عربوناً أو "رسوم حجز" لشخص لم تقابله.</li>
              <li>تحقق من الاستمارة (الملكية) ورقم الهيكل واسم البائع.</li>
              <li>احذر الأسعار الأقل بكثير من سعر السوق.</li>
              <li>قابل البائع في مكان عام وبحضور شخص آخر إن أمكن.</li>
            </ul>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-10" aria-labelledby="similar-heading">
          <h2 id="similar-heading" className="mb-4 text-xl font-bold text-gray-800">إعلانات مشابهة</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((item) => <ListingCard key={item.id} listing={item} />)}
          </div>
        </section>
      )}

      {canContact && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
          <div className="mx-auto flex max-w-xl gap-2">
            {hasPhone && (
              <a href={telLink(listing.phone as string)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 font-bold text-white">
                <Phone className="h-5 w-5" />اتصل
              </a>
            )}
            {waLink && (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 py-3 font-bold text-white">
                <MessageCircle className="h-5 w-5" />واتساب
              </a>
            )}
            <button type="button" onClick={() => setShowMessage(true)} className="flex items-center justify-center rounded-xl border-2 border-accent-500 px-4 text-accent-600" aria-label="راسل المعلن">
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {lightbox && images.length > 0 && (
        <ImageLightbox images={images} index={activeImage} alt={listing.title} onChange={setActiveImage} onClose={() => setLightbox(false)} />
      )}
      {showMessage && (
        <MessageSellerModal listingId={listing.id} sellerId={listing.user_id} listingTitle={listing.title} onClose={() => setShowMessage(false)} />
      )}
      {showReport && (
        <ReportListingModal listingId={listing.id} listingTitle={listing.title} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
