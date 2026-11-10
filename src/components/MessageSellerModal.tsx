import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isValidContact, toEnglishDigits } from '../lib/contact';
import { useAuth } from '../lib/AuthContext';
import { ModalShell } from './ModalShell';
import { showToast } from './Toast';

type Props = {
  listingId: string;
  sellerId: string;
  listingTitle: string;
  onClose: () => void;
};

const COOLDOWN_KEY = 'contact-message-last-sent';
const COOLDOWN_MS = 30_000;
const inputClass =
  'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-accent-500 focus:ring-2 focus:ring-accent-100';

export function MessageSellerModal({ listingId, sellerId, listingTitle, onClose }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    sender_name: '',
    sender_contact: user?.email ?? '',
    message: '',
    website: '', // honeypot: real visitors never see or fill this field
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.website) {
      onClose(); // bots fill hidden fields; pretend success
      return;
    }

    const contact = toEnglishDigits(form.sender_contact).trim();
    if (form.sender_name.trim().length < 2 || form.message.trim().length < 10) {
      showToast('يرجى تعبئة جميع الحقول بشكل صحيح', 'error');
      return;
    }
    if (!isValidContact(contact)) {
      showToast('أدخل رقم هاتف أو بريداً إلكترونياً صحيحاً', 'error');
      return;
    }

    const last = Number(window.localStorage.getItem(COOLDOWN_KEY) ?? 0);
    if (Date.now() - last < COOLDOWN_MS) {
      showToast('انتظر قليلاً قبل إرسال رسالة أخرى', 'error');
      return;
    }

    setSending(true);
    const { error } = await supabase.from('listing_contact_messages').insert({
      listing_id: listingId,
      seller_id: sellerId,
      sender_name: form.sender_name.trim(),
      sender_contact: contact,
      message: form.message.trim(),
    });
    setSending(false);

    if (error) {
      const throttled = /too many/i.test(error.message);
      showToast(
        throttled ? 'أرسلت عدداً كبيراً من الرسائل. حاول لاحقاً' : 'تعذر إرسال الرسالة. حاول مرة أخرى',
        'error',
      );
      return;
    }

    window.localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
    showToast('تم إرسال رسالتك إلى المعلن');
    onClose();
  };

  return (
    <ModalShell
      title="راسل المعلن"
      subtitle={`بخصوص: ${listingTitle}`}
      icon={<Mail className="h-5 w-5" />}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="msg-name">اسمك</label>
          <input
            id="msg-name"
            value={form.sender_name}
            onChange={(event) => setForm({ ...form, sender_name: event.target.value })}
            required
            minLength={2}
            maxLength={80}
            placeholder="اكتب اسمك"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="msg-contact">
            رقم الهاتف أو البريد الإلكتروني
          </label>
          <input
            id="msg-contact"
            value={form.sender_contact}
            onChange={(event) => setForm({ ...form, sender_contact: event.target.value })}
            required
            minLength={5}
            maxLength={160}
            dir="ltr"
            placeholder="09XXXXXXXX"
            className={`${inputClass} text-left`}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="msg-text">رسالتك</label>
          <textarea
            id="msg-text"
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            placeholder="مثلاً: هل السيارة ما زالت متوفرة؟ هل يمكنني معاينتها؟"
            className={`${inputClass} resize-none`}
          />
        </div>
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label>
            الموقع الإلكتروني
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(event) => setForm({ ...form, website: event.target.value })}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 py-3.5 font-bold text-white transition-all hover:bg-accent-600 disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
          {sending ? 'جاري الإرسال...' : 'إرسال الرسالة'}
        </button>
      </form>
    </ModalShell>
  );
}
