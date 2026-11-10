import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck, CheckCircle2, Clock, Eye, Heart, Loader2, Mail, MessageCircle, Pencil, Plus,
  RefreshCw, Trash2, XCircle, Car, Phone,
} from 'lucide-react';
import { supabase, type Listing, type ListingContactMessage } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { showToast } from '../components/Toast';
import { useDocumentMeta } from '../lib/seo';
import { daysLeft, isExpired, timeAgo } from '../lib/carData';
import { getPriceDisplay } from '../lib/listingPrice';
import { telLink, toInternationalPhone, whatsappLink } from '../lib/contact';

type MessageRow = ListingContactMessage & { listings?: { title: string } | null };
type Tab = 'listings' | 'messages';

const STATUS_STYLES: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: 'قيد المراجعة', className: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'منشور', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-700', icon: XCircle },
};

export function DashboardPage() {
  useDocumentMeta({
    title: 'لوحة التحكم | سوق السيارات الليبي',
    description: 'إدارة إعلاناتك ورسائل المشترين.',
    path: '/dashboard',
    noindex: true,
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('listings');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/signin');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      supabase
        .from('listings')
        .select('*, listing_categories(*), cities(*), listing_images(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('listing_contact_messages')
        .select('*, listings(title)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false }),
    ]).then(([listingsResult, messagesResult]) => {
      if (listingsResult.error || messagesResult.error) {
        showToast('حدث خطأ أثناء جلب البيانات', 'error');
      } else {
        setListings((listingsResult.data ?? []) as Listing[]);
        setMessages((messagesResult.data ?? []) as MessageRow[]);
      }
      setLoading(false);
    });
  }, [user]);

  const stats = useMemo(() => {
    const live = listings.filter((l) => l.status === 'approved' && !l.is_sold && !isExpired(l.expires_at)).length;
    return {
      total: listings.length,
      live,
      pending: listings.filter((l) => l.status === 'pending').length,
      views: listings.reduce((sum, l) => sum + (l.views_count ?? 0), 0),
      unread: messages.filter((m) => !m.read_at).length,
    };
  }, [listings, messages]);

  const patchListing = (id: string, patch: Partial<Listing>) =>
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع.')) return;
    setBusyId(id);
    const { error } = await supabase.from('listings').delete().eq('id', id);
    setBusyId(null);
    if (error) {
      showToast('حدث خطأ أثناء الحذف', 'error');
      return;
    }
    showToast('تم حذف الإعلان');
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  const handleToggleSold = async (listing: Listing) => {
    setBusyId(listing.id);
    const next = !listing.is_sold;
    const { error } = await supabase.from('listings').update({ is_sold: next }).eq('id', listing.id);
    setBusyId(null);
    if (error) {
      showToast('تعذر تحديث حالة الإعلان', 'error');
      return;
    }
    patchListing(listing.id, { is_sold: next, sold_at: next ? new Date().toISOString() : null });
    showToast(next ? 'تم وضع علامة "تم البيع"' : 'تمت إعادة الإعلان للعرض');
  };

  const handleRenew = async (listing: Listing) => {
    setBusyId(listing.id);
    const { data, error } = await supabase.rpc('renew_listing', { p_listing_id: listing.id });
    setBusyId(null);
    if (error) {
      showToast('تعذر تجديد الإعلان', 'error');
      return;
    }
    patchListing(listing.id, { expires_at: typeof data === 'string' ? data : new Date(Date.now() + 60 * 86_400_000).toISOString() });
    showToast('تم تجديد الإعلان لمدة 60 يوماً');
  };

  const handleMarkRead = async (message: MessageRow) => {
    if (message.read_at) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from('listing_contact_messages').update({ read_at: readAt }).eq('id', message.id);
    if (!error) setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, read_at: readAt } : m)));
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('حذف هذه الرسالة؟')) return;
    const { error } = await supabase.from('listing_contact_messages').delete().eq('id', id);
    if (error) {
      showToast('تعذر حذف الرسالة', 'error');
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  if (authLoading || !user || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const statCards = [
    { label: 'إعلاناتي', value: stats.total, icon: Car },
    { label: 'منشورة الآن', value: stats.live, icon: BadgeCheck },
    { label: 'قيد المراجعة', value: stats.pending, icon: Clock },
    { label: 'إجمالي المشاهدات', value: stats.views, icon: Eye },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">لوحة التحكم</h1>
          <p className="mt-1 text-sm text-gray-500" dir="ltr">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/favorites" className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <Heart className="h-4 w-4" />المفضلة
          </Link>
          <Link to="/post-listing" className="flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-bold text-white hover:bg-accent-600">
            <Plus className="h-4 w-4" />إعلان جديد
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <Icon className="mb-2 h-5 w-5 text-primary-600" />
            <p className="text-2xl font-extrabold text-gray-800">{value.toLocaleString('ar-LY')}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex gap-2 border-b border-gray-200">
        {([
          ['listings', 'إعلاناتي'],
          ['messages', 'الرسائل'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors ${
              tab === key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {key === 'messages' && stats.unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] text-white">{stats.unread}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'listings' && (
        <div className="space-y-4">
          {listings.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
              <Car className="mx-auto mb-4 h-14 w-14 text-gray-300" />
              <p className="mb-4 font-bold text-gray-700">لم تنشر أي إعلان بعد</p>
              <Link to="/post-listing" className="inline-block rounded-xl bg-accent-500 px-6 py-3 font-bold text-white hover:bg-accent-600">أضف إعلانك الأول</Link>
            </div>
          ) : (
            listings.map((listing) => {
              const status = STATUS_STYLES[listing.status] ?? STATUS_STYLES.pending;
              const StatusIcon = status.icon;
              const expired = isExpired(listing.expires_at);
              const left = daysLeft(listing.expires_at);
              const price = getPriceDisplay(listing.price, listing.is_negotiable);
              const busy = busyId === listing.id;
              return (
                <article key={listing.id} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row">
                  <Link to={`/listing/${listing.id}`} className="block h-32 w-full flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:w-44">
                    {listing.image_url ? (
                      <img src={listing.image_url} alt={listing.title} loading="lazy" className={`h-full w-full object-cover ${listing.is_sold ? 'opacity-60 grayscale' : ''}`} />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Car className="h-10 w-10 text-gray-300" /></div>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${status.className}`}>
                        <StatusIcon className="h-3.5 w-3.5" />{status.label}
                      </span>
                      {listing.is_sold && <span className="rounded-lg bg-gray-800 px-2.5 py-1 text-xs font-bold text-white">تم البيع</span>}
                      {listing.status === 'approved' && !listing.is_sold && expired && (
                        <span className="rounded-lg bg-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700">منتهي</span>
                      )}
                    </div>
                    <Link to={`/listing/${listing.id}`} className="line-clamp-1 font-bold text-gray-900 hover:text-primary-700">{listing.title}</Link>
                    <p className="mt-1 text-sm font-semibold text-accent-600">
                      {price.amount ? `${price.amount} ${price.label}` : price.label}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{(listing.views_count ?? 0).toLocaleString('ar-LY')}</span>
                      <span>نُشر {timeAgo(listing.created_at)}</span>
                      {listing.status === 'approved' && !listing.is_sold && (
                        <span className={left <= 7 ? 'font-semibold text-red-500' : ''}>
                          {expired ? 'انتهت المدة' : `ينتهي بعد ${left} يوم`}
                        </span>
                      )}
                    </p>
                    {listing.status === 'rejected' && (
                      <p className="mt-2 text-xs text-red-600">تم رفض الإعلان. عدّله ثم احفظه ليُعاد إلى المراجعة.</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link to={`/edit-listing/${listing.id}`} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        <Pencil className="h-3.5 w-3.5" />تعديل
                      </Link>
                      {listing.status === 'approved' && (
                        <button type="button" disabled={busy} onClick={() => void handleToggleSold(listing)} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                          <BadgeCheck className="h-3.5 w-3.5" />{listing.is_sold ? 'إعادة العرض' : 'تم البيع'}
                        </button>
                      )}
                      {listing.status === 'approved' && !listing.is_sold && (expired || left <= 14) && (
                        <button type="button" disabled={busy} onClick={() => void handleRenew(listing)} className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                          <RefreshCw className="h-3.5 w-3.5" />تجديد 60 يوماً
                        </button>
                      )}
                      <button type="button" disabled={busy} onClick={() => void handleDelete(listing.id)} className="mr-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" />حذف
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {tab === 'messages' && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
              <Mail className="mx-auto mb-4 h-14 w-14 text-gray-300" />
              <p className="font-bold text-gray-700">لا توجد رسائل بعد</p>
            </div>
          ) : (
            messages.map((message) => {
              const isPhone = Boolean(toInternationalPhone(message.sender_contact)) && !message.sender_contact.includes('@');
              const wa = isPhone ? whatsappLink(message.sender_contact, `مرحباً ${message.sender_name}، بخصوص استفسارك عن "${message.listings?.title ?? 'الإعلان'}"`) : null;
              return (
                <article
                  key={message.id}
                  onMouseEnter={() => void handleMarkRead(message)}
                  className={`rounded-2xl border bg-white p-4 shadow-sm ${message.read_at ? 'border-gray-100' : 'border-accent-300 bg-accent-50/40'}`}
                >
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-800">{message.sender_name}</p>
                      <p className="text-xs text-gray-500">بخصوص: {message.listings?.title ?? 'إعلان محذوف'} · {timeAgo(message.created_at)}</p>
                    </div>
                    {!message.read_at && <span className="rounded-full bg-accent-500 px-2.5 py-0.5 text-[11px] font-bold text-white">جديدة</span>}
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-gray-700">{message.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span dir="ltr" className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-700">{message.sender_contact}</span>
                    {isPhone && (
                      <a href={telLink(message.sender_contact)} className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 font-semibold text-white hover:bg-primary-700">
                        <Phone className="h-4 w-4" />اتصال
                      </a>
                    )}
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 font-semibold text-white hover:bg-green-600">
                        <MessageCircle className="h-4 w-4" />واتساب
                      </a>
                    )}
                    {message.sender_contact.includes('@') && (
                      <a href={`mailto:${message.sender_contact}`} className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 font-semibold text-white hover:bg-primary-700">
                        <Mail className="h-4 w-4" />رد بالبريد
                      </a>
                    )}
                    <button type="button" onClick={() => void handleDeleteMessage(message.id)} className="mr-auto rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50" aria-label="حذف الرسالة">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
