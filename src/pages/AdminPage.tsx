import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Trash2, Clock, Loader2, ShieldCheck, Building, MessageSquare, Car, Fuel, Settings, Settings2, Save, Facebook, Instagram, Twitter, Youtube, MessageCircle, Send, Share2, DollarSign, Upload, X, BarChart3, UserMinus, BookOpen, Flag } from 'lucide-react';
import { supabase, type Listing, type Profile, type SiteSettings } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { showToast } from '../components/Toast';
import { getPriceDisplay } from '../lib/listingPrice';
import { AnalyticsPanel } from './AdminAnalyticsPanel';
import { AdminBlogPanel } from './AdminBlogPanel';
import { AdminCleanupPanel } from './AdminCleanupPanel';
import { AdminReportsPanel } from './AdminReportsPanel';
import { useDocumentMeta } from '../lib/seo';

type AdminTab = 'pending' | 'approved' | 'rejected' | 'reports' | 'analytics' | 'blog' | 'cleanup' | 'users' | 'settings';

type AnalyticsSummary = {
  days: number;
  total_views: number;
  today_views: number;
  unique_visitors: number;
  listing_views: number;
  cities: { name: string; views: number }[];
  top_listings: { id: string; title: string; views: number }[];
  daily_views: { date: string; views: number }[];
};

export function AdminPage() {
  useDocumentMeta({
    title: 'لوحة الإدارة | سوق السيارات الليبي',
    description: 'لوحة إدارة الموقع.',
    path: '/admin',
    noindex: true,
  });

  const { user, profile, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<AdminTab>('pending');
  const [listings, setListings] = useState<Listing[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [settingsForm, setSettingsForm] = useState<SiteSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'admin')) {
      showToast('لا تملك صلاحية الوصول لهذه الصفحة', 'error');
      window.location.href = '/';
    }
  }, [authLoading, user, profile]);

  const fetchListings = useCallback((status: string) => {
    setLoading(true);
    let query = supabase
      .from('listings')
      .select('*, listing_categories(*), cities(*), listing_images(*)')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    query.then(({ data, error }) => {
      if (error) {
        showToast('حدث خطأ أثناء جلب البيانات', 'error');
      } else {
        setListings(data ?? []);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || profile?.role !== 'admin') return;

    if (tab === 'pending') fetchListings('pending');
    else if (tab === 'approved') fetchListings('approved');
    else if (tab === 'rejected') fetchListings('rejected');
    else if (tab === 'analytics') {
      setLoading(true);
      supabase.rpc('get_admin_analytics', { p_days: 30 }).then(({ data, error }) => {
        if (error) showToast('تعذر تحميل التحليلات', 'error');
        setAnalytics(data as AnalyticsSummary | null);
        setLoading(false);
      });
    }
    else if (tab === 'users') {
      setLoading(true);
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
        if (error) showToast('تعذر تحميل الأعضاء', 'error');
        setProfiles(data ?? []);
        setLoading(false);
      });
    }
    else if (tab === 'settings') {
      setLoading(true);
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
        setSettingsForm(data);
        setLoading(false);
      });
    }
  }, [user, profile, tab, fetchListings]);

  const handleApprove = async (id: string) => {
    const { error } = await supabase.rpc('approve_listing', { p_listing_id: id });
    if (error) {
      showToast('حدث خطأ', 'error');
    } else {
      showToast('تمت الموافقة على الإعلان');
      setListings(listings.filter((l) => l.id !== id));
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.rpc('reject_listing', { p_listing_id: id });
    if (error) {
      showToast('حدث خطأ', 'error');
    } else {
      showToast('تم رفض الإعلان');
      setListings(listings.filter((l) => l.id !== id));
    }
  };

  const runStorageCleanup = () => {
    supabase.functions.invoke('storage-cleanup').then(({ error }) => {
      if (error) console.error('storage cleanup failed', error);
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان نهائياً؟')) return;
    const { error } = await supabase.rpc('admin_delete_listing', { p_listing_id: id });
    if (error) {
      showToast('حدث خطأ', 'error');
    } else {
      showToast('تم حذف الإعلان');
      setListings(listings.filter((l) => l.id !== id));
      runStorageCleanup();
    }
  };

  const handleSetRole = async (userId: string, role: string) => {
    const { error } = await supabase.rpc('set_user_role', { p_user_id: userId, p_role: role });
    if (error) {
      showToast('حدث خطأ', 'error');
    } else {
      showToast(role === 'admin' ? 'تم ترقية المستخدم إلى مدير' : 'تم تخفيض المستخدم إلى عضو');
      setProfiles(profiles.map((p) => p.id === userId ? { ...p, role } : p));
    }
  };

  const handleDeleteMember = async (userId: string) => {
    if (!confirm('سيتم حذف العضو وإعلاناته ورسائله نهائياً. هل تريد المتابعة؟')) return;
    const { error } = await supabase.rpc('admin_delete_member', { p_user_id: userId });
    if (error) {
      showToast('تعذر حذف العضو', 'error');
      return;
    }
    setProfiles(profiles.filter((profileItem) => profileItem.id !== userId));
    showToast('تم حذف العضو');
    runStorageCleanup();
  };

  const handleSaveSettings = async () => {
    if (!settingsForm) return;
    setSavingSettings(true);
    const { error } = await supabase.rpc('upsert_site_settings', {
      p_contact_email: settingsForm.contact_email || '',
      p_contact_phone: settingsForm.contact_phone || '',
      p_contact_address: settingsForm.contact_address || '',
      p_social_facebook: settingsForm.social_facebook || '',
      p_social_instagram: settingsForm.social_instagram || '',
      p_social_twitter: settingsForm.social_twitter || '',
      p_social_whatsapp: settingsForm.social_whatsapp || '',
      p_social_telegram: settingsForm.social_telegram || '',
      p_social_youtube: settingsForm.social_youtube || '',
      p_adsense_code: settingsForm.adsense_code || '',
      p_privacy_policy: settingsForm.privacy_policy || '',
      p_terms_of_use: settingsForm.terms_of_use || '',
      p_logo_url: settingsForm.logo_url || '',
    });
    setSavingSettings(false);
    if (error) {
      showToast('حدث خطأ أثناء حفظ الإعدادات', 'error');
    } else {
      showToast('تم حفظ الإعدادات بنجاح');
    }
  };

  if (authLoading || !user || profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  const tabs: { key: AdminTab; label: string; icon: typeof Clock }[] = [
    { key: 'pending', label: 'إعلانات قيد المراجعة', icon: Clock },
    { key: 'approved', label: 'إعلانات موافق عليها', icon: CheckCircle2 },
    { key: 'rejected', label: 'إعلانات مرفوضة', icon: XCircle },
    { key: 'reports', label: 'البلاغات', icon: Flag },
    { key: 'analytics', label: 'التحليلات', icon: BarChart3 },
    { key: 'blog', label: 'المقالات', icon: BookOpen },
    { key: 'cleanup', label: 'تنظيف الصور', icon: Trash2 },
    { key: 'users', label: 'المستخدمون', icon: ShieldCheck },
    { key: 'settings', label: 'إعدادات الموقع', icon: Settings2 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">لوحة الإدارة</h1>
          <p className="text-sm text-gray-500 mt-1">مراجعة وإدارة إعلانات السيارات والمستخدمين وإعدادات الموقع</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-100 p-1.5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              tab === t.key ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : tab === 'users' ? (
        <div className="space-y-3">
          {profiles.length > 0 ? (
            profiles.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${p.role === 'admin' ? 'bg-red-500' : 'bg-primary-500'}`}>
                    {p.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{p.email}</p>
                    <span className={`text-xs font-semibold ${p.role === 'admin' ? 'text-red-500' : 'text-gray-400'}`}>
                      {p.role === 'admin' ? 'مدير' : 'عضو'}
                    </span>
                  </div>
                </div>
                {p.id !== user.id && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => handleSetRole(p.id, p.role === 'admin' ? 'member' : 'admin')}
                      className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
                        p.role === 'admin'
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-red-50 text-red-500 hover:bg-red-100'
                      }`}
                    >
                      {p.role === 'admin' ? 'تخفيض إلى عضو' : 'ترقية إلى مدير'}
                    </button>
                    {p.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteMember(p.id)}
                        className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-500 hover:text-white"
                      >
                        <UserMinus className="h-4 w-4" />
                        حذف العضو
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-2">لا يوجد مستخدمون</h3>
            </div>
          )}
        </div>
      ) : tab === 'analytics' ? (
        <AnalyticsPanel analytics={analytics} />
      ) : tab === 'blog' ? (
        <AdminBlogPanel />
      ) : tab === 'cleanup' ? (
        <AdminCleanupPanel />
      ) : tab === 'reports' ? (
        <AdminReportsPanel />
      ) : tab === 'settings' ? (
        <div className="space-y-6">
          {settingsForm && (
            <>
              {/* Contact Info */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary-500" />
                  معلومات التواصل (تظهر في أسفل الموقع)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={settingsForm.contact_email}
                      onChange={(e) => setSettingsForm({ ...settingsForm, contact_email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">رقم الهاتف</label>
                    <input
                      type="text"
                      value={settingsForm.contact_phone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, contact_phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">العنوان</label>
                    <input
                      type="text"
                      value={settingsForm.contact_address}
                      onChange={(e) => setSettingsForm({ ...settingsForm, contact_address: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Site Logo */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <Car className="w-5 h-5 text-primary-500" />
                  شعار الموقع
                </h3>
                <p className="text-xs text-gray-400 mb-4">الشعار الافتراضي مصمم للسيارات. يمكنك رفع شعارك لاحقاً وسيظهر في أعلى وأسفل الموقع.</p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-primary-500 flex items-center justify-center overflow-hidden">
                    {settingsForm.logo_url ? <img src={settingsForm.logo_url} alt="شعار الموقع" className="w-full h-full object-contain" /> : <Car className="w-12 h-12 text-white" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all">
                      <Upload className="w-4 h-4" />
                      رفع شعار
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        disabled={uploadingLogo}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            showToast('حجم الشعار يجب ألا يتجاوز 2 ميغابايت', 'error');
                            return;
                          }
                          setUploadingLogo(true);
                          const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
                          const path = `logo-${Date.now()}.${extension}`;
                          const upload = await supabase.storage.from('site-logos').upload(path, file, { upsert: true, contentType: file.type });
                          if (upload.error) {
                            showToast('تعذر رفع الشعار', 'error');
                          } else {
                            const { data } = supabase.storage.from('site-logos').getPublicUrl(path);
                            setSettingsForm({ ...settingsForm, logo_url: data.publicUrl });
                            showToast('تم رفع الشعار، اضغط حفظ الإعدادات لتثبيته');
                          }
                          setUploadingLogo(false);
                          event.target.value = '';
                        }}
                      />
                    </label>
                    {settingsForm.logo_url && (
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, logo_url: '' })}
                        className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      >
                        <X className="w-4 h-4" />
                        استخدام الشعار الافتراضي
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-primary-500" />
                  روابط مواقع التواصل الاجتماعي
                </h3>
                <p className="text-xs text-gray-400 mb-4">ضع روابط حساباتك في مواقع التواصل. ستظهر كأيقونات في أسفل الموقع.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'social_facebook', label: 'فيسبوك', icon: Facebook },
                    { key: 'social_instagram', label: 'إنستغرام', icon: Instagram },
                    { key: 'social_twitter', label: 'تويتر / X', icon: Twitter },
                    { key: 'social_youtube', label: 'يوتيوب', icon: Youtube },
                    { key: 'social_whatsapp', label: 'واتساب', icon: MessageCircle },
                    { key: 'social_telegram', label: 'تيليغرام', icon: Send },
                  ].map((s) => (
                    <div key={s.key}>
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <s.icon className="w-4 h-4 text-gray-500" />
                        {s.label}
                      </label>
                      <input
                        type="url"
                        value={(settingsForm as unknown as Record<string, string>)[s.key] || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, [s.key]: e.target.value })}
                        placeholder={`https://${s.label}.com/...`}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Google AdSense */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  إعلانات جوجل ادسنس (Google AdSense)
                </h3>
                <p className="text-xs text-gray-400 mb-3">ضع كود الإعلان من جوجل ادسنس هنا. سيظهر أسفل الموقع تلقائياً.</p>
                <textarea
                  value={settingsForm.adsense_code}
                  onChange={(e) => setSettingsForm({ ...settingsForm, adsense_code: e.target.value })}
                  rows={6}
                  placeholder={'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" ...></script>'}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm font-mono resize-none"
                  dir="ltr"
                />
              </div>

              {/* Privacy Policy */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-4">سياسة الخصوصية</h3>
                <p className="text-xs text-gray-400 mb-3">اكتب نص سياسة الخصوصية. سيظهر في صفحة سياسة الخصوصية أسفل الموقع.</p>
                <textarea
                  value={settingsForm.privacy_policy}
                  onChange={(e) => setSettingsForm({ ...settingsForm, privacy_policy: e.target.value })}
                  rows={8}
                  placeholder="اكتب سياسة الخصوصية هنا..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm resize-none"
                />
              </div>

              {/* Terms of Use */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-fade-in">
                <h3 className="font-bold text-gray-800 mb-4">شروط الاستخدام</h3>
                <p className="text-xs text-gray-400 mb-3">اكتب نص شروط الاستخدام. سيظهر في صفحة شروط الاستخدام أسفل الموقع.</p>
                <textarea
                  value={settingsForm.terms_of_use}
                  onChange={(e) => setSettingsForm({ ...settingsForm, terms_of_use: e.target.value })}
                  rows={8}
                  placeholder="اكتب شروط الاستخدام هنا..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all text-sm resize-none"
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-60"
                >
                  {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {listings.length > 0 ? (
            listings.map((l) => (
              <div key={l.id} className="bg-white rounded-2xl border border-gray-100 p-5 animate-fade-in">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Image */}
                  <div className="w-full sm:w-32 h-32 rounded-xl overflow-hidden bg-gradient-to-br from-accent-100 to-accent-200 flex-shrink-0">
                    {(l.listing_images?.[0]?.image_url || l.image_url) ? (
                      <img src={l.listing_images?.[0]?.image_url || l.image_url!} alt={l.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-12 h-12 text-accent-300" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-gray-800 text-base">{l.title}</h3>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                        l.ad_type === 'rent' ? 'bg-blue-50 text-blue-600' : 'bg-accent-50 text-accent-600'
                      }`}>
                        {l.ad_type === 'rent' ? 'للإيجار' : 'للبيع'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{l.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
                      {l.listing_categories && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5" />
                          {l.listing_categories.name}
                        </span>
                      )}
                      {l.cities && (
                        <span>{l.cities.name}</span>
                      )}
                      {getPriceDisplay(l.price, l.is_negotiable).amount && (
                        <span className="font-semibold text-accent-600">
                          {getPriceDisplay(l.price, l.is_negotiable).amount} د.ل
                        </span>
                      )}
                      {l.car_make && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <Car className="w-3.5 h-3.5" />
                          {l.car_make}{l.car_model ? ` - ${l.car_model}` : ''}
                        </span>
                      )}
                      {l.fuel_type && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <Fuel className="w-3.5 h-3.5" />
                          {l.fuel_type === 'petrol' ? 'بنزين' : l.fuel_type === 'diesel' ? 'ديزل' : l.fuel_type === 'hybrid' ? 'هايبرد' : 'كهربائي'}
                        </span>
                      )}
                      {l.transmission && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <Settings className="w-3.5 h-3.5" />
                          {l.transmission === 'automatic' ? 'أوتوماتيك' : 'عادي'}
                        </span>
                      )}
                      <span>{new Date(l.created_at).toLocaleDateString('ar-LY')}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {tab === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(l.id)}
                            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            موافقة
                          </button>
                          <button
                            onClick={() => handleReject(l.id)}
                            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                          >
                            <XCircle className="w-4 h-4" />
                            رفض
                          </button>
                        </>
                      )}
                      {tab === 'approved' && (
                        <button
                          onClick={() => handleReject(l.id)}
                          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                        >
                          <XCircle className="w-4 h-4" />
                          سحب الموافقة
                        </button>
                      )}
                      {tab === 'rejected' && (
                        <button
                          onClick={() => handleApprove(l.id)}
                          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          موافقة
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(l.id)}
                        className="flex items-center gap-1.5 bg-gray-100 hover:bg-red-500 hover:text-white text-red-500 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف نهائي
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-700 mb-2">لا توجد إعلانات في هذه القائمة</h3>
              <p className="text-sm text-gray-400">
                {tab === 'pending' ? 'لا توجد إعلانات تنتظر المراجعة' : tab === 'approved' ? 'لا توجد إعلانات موافق عليها' : 'لا توجد إعلانات مرفوضة'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
