import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Send, Trash2 } from 'lucide-react';

import { supabase, type ListingCategory, type City } from '../lib/supabase';
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
import {
  LISTING_AUTH_RETURN_KEY,
  clearListingDraft,
  emptyListingForm,
  hasDraftContent,
  loadListingDraft,
  saveListingDraft,
  type ListingDraftForm,
} from '../lib/listingDraft';
import { buildCreateParams, getFormError, isCarCategory } from '../lib/listingValidation';

export function PostListingPage() {
  useDocumentMeta({
    title: 'أضف إعلان سيارة | سوق السيارات الليبي',
    description: 'انشر إعلان سيارتك مجاناً على سوق السيارات الليبي.',
    path: '/post-listing',
    noindex: true,
  });

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [form, setForm] = useState<ListingDraftForm>(emptyListingForm);
  const [draftReady, setDraftReady] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (authLoading || draftReady) return;
    const { draft, expiredImageUrls } = loadListingDraft(userId);
    if (expiredImageUrls.length > 0) void removeListingImages(expiredImageUrls);
    if (draft) {
      setForm(draft.form);
      setImageUrls(draft.imageUrls);
    }
    setDraftReady(true);
  }, [authLoading, userId, draftReady]);

  useEffect(() => {
    if (!draftReady) return;
    if (hasDraftContent(form, imageUrls)) {
      saveListingDraft(userId, form, imageUrls);
    } else {
      clearListingDraft(userId);
    }
  }, [draftReady, userId, form, imageUrls]);

  useEffect(() => {
    Promise.all([
      supabase.from('listing_categories').select('*').order('sort_order'),
      supabase.from('cities').select('*').order('sort_order'),
    ]).then(([catRes, cityRes]) => {
      if (catRes.error || cityRes.error) {
        showToast('تعذر تحميل بيانات النموذج. أعد تحميل الصفحة', 'error');
        return;
      }
      setCategories(catRes.data ?? []);
      setCities(cityRes.data ?? []);
    });
  }, []);

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
    if (selected.length === 0) return;

    if (!user) {
      window.localStorage.setItem(LISTING_AUTH_RETURN_KEY, '/post-listing');
      showToast('تم حفظ بيانات الإعلان. سجل الدخول لرفع الصور');
      navigate('/signin');
      return;
    }

    const remaining = MAX_LISTING_IMAGES - imageUrls.length;
    if (remaining <= 0) {
      showToast(`وصلت للحد الأقصى وهو ${MAX_LISTING_IMAGES} صور`, 'error');
      return;
    }
    if (selected.length > remaining) {
      showToast(`يمكنك إضافة ${remaining} صور فقط`, 'error');
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
    if (failed > 0) showToast(`تعذر رفع ${failed} من الصور. حاول مرة أخرى`, 'error');
    setUploading(false);
  };

  const removeImage = (url: string) => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
    void removeListingImages([url]);
  };

  const makeCover = (url: string) => {
    setImageUrls((prev) => [url, ...prev.filter((u) => u !== url)]);
  };

  const handleDeleteDraft = async () => {
    if (!window.confirm('هل تريد حذف الإعلان المحفوظ؟ سيتم حذف الصور المرفوعة معه.')) return;
    const urls = imageUrls;
    setForm(emptyListingForm);
    setImageUrls([]);
    clearListingDraft(userId);
    await removeListingImages(urls);
    showToast('تم حذف المسودة');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading || uploading) return;

    if (!user) {
      window.localStorage.setItem(LISTING_AUTH_RETURN_KEY, '/post-listing');
      showToast('تم حفظ الإعلان مؤقتاً. سجل الدخول للانتقال إلى المرحلة الثانية');
      navigate('/signin');
      return;
    }

    const formError = getFormError(form, imageUrls.length);
    if (formError) {
      showToast(formError, 'error');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    const { data, error } = await supabase.rpc(
      'create_listing',
      buildCreateParams(form, isCarCategory(categories, form.category_id), imageUrls),
    );

    if (error || typeof data !== 'string') {
      console.error('create_listing failed', error);
      submittingRef.current = false;
      setLoading(false);
      const uploadedUrls = imageUrls;
      setImageUrls([]);
      await removeListingImages(uploadedUrls);
      const photoProblem = error?.message.toLowerCase().includes('photo');
      showToast(
        photoProblem
          ? 'تعذر التحقق من الصور المرفوعة. أعد رفع الصور ثم حاول مرة أخرى'
          : 'حدث خطأ أثناء نشر الإعلان. تم حذف الصور المرفوعة، أعد رفعها ثم حاول مرة أخرى',
        'error',
      );
      return;
    }

    clearListingDraft(userId);
    showToast('تم نشر إعلانك بنجاح. سيظهر بعد موافقة الإدارة');
    navigate(`/listing/${data}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-800 md:text-3xl">أضف إعلان سيارة</h1>
        <p className="text-sm text-gray-500">املأ التفاصيل أدناه. سيتم مراجعة الإعلان من قبل الإدارة قبل ظهوره للجميع.</p>
      </div>

      <form onSubmit={handleSubmit} className="animate-slide-up space-y-5">
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
            disabled={loading || uploading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-500 py-4 font-bold text-white transition-all hover:bg-accent-600 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            {loading ? 'جاري النشر...' : 'نشر الإعلان'}
          </button>
          {hasDraftContent(form, imageUrls) && (
            <button
              type="button"
              onClick={handleDeleteDraft}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-6 py-4 font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-5 w-5" />
              حذف المسودة
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
