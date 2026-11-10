import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { REPORT_REASONS } from '../lib/carData';
import { ModalShell } from './ModalShell';
import { showToast } from './Toast';

type Props = {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
};

const COOLDOWN_KEY = 'listing-report-last-sent';
const COOLDOWN_MS = 20_000;

export function ReportListingModal({ listingId, listingTitle, onClose }: Props) {
  const [reason, setReason] = useState('fraud');
  const [details, setDetails] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (website) {
      onClose();
      return;
    }
    const last = Number(window.localStorage.getItem(COOLDOWN_KEY) ?? 0);
    if (Date.now() - last < COOLDOWN_MS) {
      showToast('انتظر قليلاً قبل إرسال بلاغ آخر', 'error');
      return;
    }

    setSending(true);
    const { error } = await supabase.from('listing_reports').insert({
      listing_id: listingId,
      reason,
      details: details.trim() || null,
    });
    setSending(false);

    if (error) {
      showToast(
        /too many/i.test(error.message) ? 'تم استلام بلاغات كثيرة على هذا الإعلان' : 'تعذر إرسال البلاغ. حاول مرة أخرى',
        'error',
      );
      return;
    }

    window.localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
    showToast('شكراً لك، سنراجع البلاغ');
    onClose();
  };

  return (
    <ModalShell
      title="الإبلاغ عن إعلان"
      subtitle={listingTitle}
      icon={<Flag className="h-5 w-5" />}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-gray-700">سبب البلاغ</legend>
          {REPORT_REASONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                reason === option.value ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                className="accent-accent-500"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="report-details">
            تفاصيل إضافية (اختياري)
          </label>
          <textarea
            id="report-details"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
          />
        </div>
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 font-bold text-white transition-all hover:bg-red-700 disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Flag className="h-5 w-5" />}
          {sending ? 'جاري الإرسال...' : 'إرسال البلاغ'}
        </button>
      </form>
    </ModalShell>
  );
}
