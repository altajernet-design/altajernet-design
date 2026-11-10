import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Loader2, Save } from 'lucide-react';

import { supabase, type City, type Listing, type ListingCategory } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { showToast } from '../components/Toast';
import { ListingFormFields } from '../components/ListingFormFields';
import { useDocumentMeta } from '../lib/seo';
import {
  MAX_LISTING_IMAGES,
  removeListingImages,
  uploadListingImage,
  validateListingImageFile,
} from '../lib/listingImages';
import { emptyListingForm, type ListingDraftForm } from '../lib/listingDraft';
import { buildListingFields, getFormError, isCarCategory } from '../lib/listingValidation';

function formFromListing(listing: Listing): ListingDraftForm {
  return {
    ...emptyListingForm,
    title: listing.title,
    description: listing.description,
    ad_type: listing.ad_type,
    category_id: listing.category_id ?? '',
    city_id: listing.city_id ?? '',
    price: listing.price === null ? '' : String(listing.price),
    is_negotiable: listing.is_negotiable,
    phone: listing.phone ?? '',
    car_make: listing.car_make ?? '',
    car_model: listing.car_model ?? '',
    fuel_type: listing.fuel_type ?? '',
    transmission: listing.transmission ?? '',
    year: listing.year ? String(listing.year) : '',
    mileage_km: listing.mileage_km === null ? '' : String(listing.mileage_km),
    color: listing.color ?? '',
    condition: listing.condition ?? '',
    body_type: listing.body_type ?? '',
    customs_status: listing.customs_status ?? '',
  };
}

export function EditListingPage() {
  useDocumentMeta({
    title: 'تعديل الإعلان | سوق السيارات الليبي',
    description: 'تعديل بيانات إعلان السيارة.',
    path: '/edit-listing',
    noindex: true,
  });

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [listing, setListing] = useState<Listing | null>(null);
  const [form, setForm] = useState<ListingDraftForm>(emptyListingForm);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [original, setOriginal] = useState<ListingDraftForm>(emptyListingForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/signin');
      return;
    }
    if (!id) return;

    let active = true;
    Promise.all([
      supabase.from('listings').select('*, listing_images(*)').eq('id', id).maybeSingle(),
      supabase.from('listing_categories').select('*').order('sort_order'),
      supabase.from('cities').select('*').order('sort_order'),
    ]).then(([listingRes, catRes, cityRes]) => {
      if (!active) return;
      const data = listingRes.data as Listing | null;
      if (listingRes.error || !data || data.user_id !== user.id) {
        showToast('لا يمكنك تعديل هذا الإعلان', 'error');
        navigate('/dashboard');
        return;
      }
      const images = [...(data.listing_images ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((image) => image.image_url);
      const initial = formFromListing(data);
      setListing(data);
      setForm(initial);
      setOriginal(initial);
      setImageUrls(images);
      setOriginalImages(images);
      setCategories(catRes.data ?? []);
      setCities(cityRes.data ?? []);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [authLoading, user, id, navigate]);

  const imagesChanged = useMemo(
    () => imageUrls.length !== originalImages.length || imageUrls.some((url, i) => url !== originalImages[i]),
    [imageUrls, originalImages],
  );

  const needsReview = useMemo(() => {
    if (!listing || listing.status === 'pending') return false;
    const textChanged =
      form.title.trim() !== original.title ||
      form.description.trim() !== original.description ||
      form.phone.trim() !== original.phone ||
      form.car_make !== original.car_make ||
      form.car_model.trim() !== original.car_model;
    return textChanged || imagesChanged;
  }, [form, original, listing, imagesChanged]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const next = e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : value;
    setForm((prev) => ({ ...prev, [name]: next }));
  };

  const setField = (name: keyof ListingDraftForm, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const selected = Array.from(input.files ?? []);
    input.value = '';
    if (selected.length === 0 || !user) return;

    const remaining = MAX_LISTING_IMAGES - imageUrls.length;
    if (remaining <= 0) {
      showToast(`وصلت للحد الأقصى وهو ${MAX_LISTING_IMAGES} صور`, 'error');
      return;
    }

    setUploading(true);
    const uploaded: string[] = [];
    let failed = 0;
    for (const [index, file] of selected.slice(0, remaining).entries()) {
      const problem = validateListingImageFile(file);
      if (problem) {
        showToast(problem, 'error');
        failed += 1;
        continue;
      }
      try {
        uploaded.push(await uploadListingImage(user.id, file, index));
      } catch (error) {
        console.error('listing image upload failed', error);
        failed += 1;
      }
    }
    if (uploaded.length > 0) setImageUrls((prev) => [...prev, ...uploaded]);
    if (failed > 0) showToast(`تعذر رفع ${failed} من الصور`, 'error');
    setUploading(false);
  };

  const removeImage = (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
    // Photos added in this session were never saved, so they can be deleted right away.
    if (!originalImages.includes(url)) void removeListingImages([url]);
  };

  const makeCover = (url: string) => setImageUrls((prev) => [url, ...prev.filter((u) => u !== url)]);

  const handleCancel = async () => {
    const unsaved = imageUrls.filter((url) => !originalImages.includes(url));
    if (unsaved.length > 0) await removeListingImages(unsaved);
    navigate('/dashboard');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!listing || savingRef.current || saving || uploading) return;

    const formError = getFormError(form, imageUrls.length);
    if (formError) {
      showToast(formError, 'error');
      return;
    }

    savingRef.current = true;
    setSaving(true);

    if (imagesChanged) {
      const { error } = await supabase.rpc('update_listing_images', {
        p_listing_id: listing.id,
        p_image_urls: imageUrls,
      });
      if (error) {
        console.error('update_listing_images failed', error);
        savingRef.current = false;
        setSaving(false);
        showToast('تعذر تحديث الصور. حاول مرة أخرى', 'error');
        return;
      }
    }

    const { error } = await supabase
      .from('listings')
      .update(buildListingFields(form, isCarCategory(categories, form.category_id)))
      .eq('id', listing.id);

    savingRef.current = false;
    setSaving(false);

    if (error) {
      console.error('listing update failed', error);
      showToast('تعذر حفظ التعديلات. حاول مرة أخرى', 'error');
      return;
    }

    const removed = originalImages.filter((url) => !imageUrls.includes(url));
    if (removed.length > 0) void removeListingImages(removed);

    showToast(needsReview ? 'تم الحفظ. سيراجع الفريق التعديلات قبل ظهورها' : 'تم حفظ التعديلات');
    navigate(`/listing/${listing.id}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-800 md:text-3xl">تعديل الإعلان</h1>
      <p className="mb-6 text-sm text-gray-500">عدّل البيانات ثم احفظ. يمكنك أيضاً إدارة الصور وترتيبها.</p>

      {needsReview && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>تعديل العنوان أو الوصف أو الهاتف أو الماركة أو الصور يعيد الإعلان إلى المراجعة، ولن يظهر للزوار حتى تتم الموافقة عليه.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <ListingFormFields
          form={form}
          onChange={handleChange}
          setField={setField}
          categories={categories}
          cities={cities}
          imageUrls={imageUrls}
          uploading={uploading}
          onUpload={handleImageUpload}
          onRemoveImage={removeImage}
          onMakeCover={makeCover}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 py-4 font-bold text-white transition-all hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
          <button
            type="button"
            onClick={() => void handleCancel()}
            className="rounded-xl border border-gray-200 px-8 py-4 font-semibold text-gray-600 hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
