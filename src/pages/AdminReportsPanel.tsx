import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, EyeOff, Loader2, Trash2, XCircle } from 'lucide-react';
import { supabase, type ListingReport } from '../lib/supabase';
import { showToast } from '../components/Toast';
import { REPORT_REASONS, labelOf, timeAgo } from '../lib/carData';

type Filter = 'open' | 'resolved' | 'dismissed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'open', label: 'مفتوحة' },
  { key: 'resolved', label: 'تمت المعالجة' },
  { key: 'dismissed', label: 'مرفوضة' },
];

export function AdminReportsPanel() {
  const [filter, setFilter] = useState<Filter>('open');
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('listing_reports')
      .select('*, listings(id, title, status)')
      .eq('status', filter)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) showToast('تعذر تحميل البلاغات', 'error');
    setReports((data ?? []) as ListingReport[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (report: ListingReport, status: Filter) => {
    setBusyId(report.id);
    const { error } = await supabase.from('listing_reports').update({ status }).eq('id', report.id);
    setBusyId(null);
    if (error) {
      showToast('تعذر تحديث البلاغ', 'error');
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== report.id));
  };

  const hideListing = async (report: ListingReport) => {
    if (!report.listings) return;
    if (!window.confirm('إخفاء الإعلان ورفضه؟')) return;
    setBusyId(report.id);
    const { error } = await supabase.rpc('reject_listing', { p_listing_id: report.listings.id });
    if (error) {
      setBusyId(null);
      showToast('تعذر إخفاء الإعلان', 'error');
      return;
    }
    await setStatus(report, 'resolved');
    showToast('تم إخفاء الإعلان وإغلاق البلاغ');
  };

  const remove = async (report: ListingReport) => {
    if (!window.confirm('حذف هذا البلاغ نهائياً؟')) return;
    setBusyId(report.id);
    const { error } = await supabase.from('listing_reports').delete().eq('id', report.id);
    setBusyId(null);
    if (error) {
      showToast('تعذر حذف البلاغ', 'error');
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== report.id));
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              filter === item.key ? 'bg-primary-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary-600" /></div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center text-gray-500">لا توجد بلاغات في هذه القائمة</div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                  {labelOf(REPORT_REASONS, report.reason) ?? report.reason}
                </span>
                <span className="text-xs text-gray-400">{timeAgo(report.created_at)}</span>
              </div>
              {report.listings ? (
                <Link to={`/listing/${report.listings.id}`} target="_blank" className="font-bold text-gray-800 hover:text-primary-700">
                  {report.listings.title}
                </Link>
              ) : (
                <p className="font-bold text-gray-400">إعلان محذوف</p>
              )}
              {report.details && <p className="mt-2 whitespace-pre-line text-sm leading-7 text-gray-600">{report.details}</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                {filter === 'open' && (
                  <>
                    {report.listings && report.listings.status === 'approved' && (
                      <button type="button" disabled={busyId === report.id} onClick={() => void hideListing(report)} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                        <EyeOff className="h-3.5 w-3.5" />إخفاء الإعلان
                      </button>
                    )}
                    <button type="button" disabled={busyId === report.id} onClick={() => void setStatus(report, 'resolved')} className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" />تمت المعالجة
                    </button>
                    <button type="button" disabled={busyId === report.id} onClick={() => void setStatus(report, 'dismissed')} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                      <XCircle className="h-3.5 w-3.5" />تجاهل
                    </button>
                  </>
                )}
                <button type="button" disabled={busyId === report.id} onClick={() => void remove(report)} className="mr-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5" />حذف
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
