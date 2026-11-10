import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, MessageCircle, Send, Phone, Mail, MapPin, ShieldCheck, Cookie } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { resetCookieConsent } from '../lib/consent';
import { useSiteSettings } from '../lib/siteSettings';
import { POPULAR_MAKES } from '../lib/carData';
import { AdSlot } from './AdSlot';
import { BrandLogo } from './BrandLogo';
import { VisitorCounter } from './VisitorCounter';

export function Footer() {
  const { isAdmin } = useAuth();
  const settings = useSiteSettings();

  const socials = settings ? [
    { url: settings.social_facebook, icon: Facebook, label: 'Facebook' },
    { url: settings.social_instagram, icon: Instagram, label: 'Instagram' },
    { url: settings.social_twitter, icon: Twitter, label: 'Twitter' },
    { url: settings.social_youtube, icon: Youtube, label: 'YouTube' },
    { url: settings.social_whatsapp, icon: MessageCircle, label: 'WhatsApp' },
    { url: settings.social_telegram, icon: Send, label: 'Telegram' },
  ].filter((s) => s.url && s.url.trim()) : [];

  return (
    <>
      <AdSlot className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8" />

      <footer className="bg-gray-900 text-gray-300 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="mb-4">
                <BrandLogo dark />
              </div>
              <p className="text-sm leading-relaxed text-gray-400">
                منصة سيارات متخصصة في بيع وشراء وتأجير السيارات في ليبيا. تصفح أحدث السيارات واعرض سيارتك للبيع أو الإيجار بسهولة.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">روابط سريعة</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-primary-400 transition-colors">الرئيسية</Link></li>
                <li><Link to="/listings" className="hover:text-primary-400 transition-colors">تصفح السيارات</Link></li>
                <li><Link to="/blog" className="hover:text-primary-400 transition-colors">المدونة</Link></li>
                <li><Link to="/about" className="hover:text-primary-400 transition-colors">من نحن</Link></li>
                <li><Link to="/post-listing" className="hover:text-primary-400 transition-colors">أضف إعلان سيارة</Link></li>
                <li><Link to="/favorites" className="hover:text-primary-400 transition-colors">المفضلة</Link></li>
                <li><Link to="/dashboard" className="hover:text-primary-400 transition-colors">لوحة التحكم</Link></li>
                {isAdmin && (
                  <li><Link to="/admin" className="flex items-center gap-1 hover:text-red-400 transition-colors font-semibold"><ShieldCheck className="w-3.5 h-3.5" /> لوحة الإدارة</Link></li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4">تواصل معنا</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                {settings?.contact_address && (
                  <li className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary-400 flex-shrink-0" />
                    {settings.contact_address}
                  </li>
                )}
                {settings?.contact_email && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary-400 flex-shrink-0" />
                    <span dir="ltr">{settings.contact_email}</span>
                  </li>
                )}
                {settings?.contact_phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary-400 flex-shrink-0" />
                    <span dir="ltr">{settings.contact_phone}</span>
                  </li>
                )}
              </ul>

              {socials.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors"
                      aria-label={s.label}
                    >
                      <s.icon className="w-4 h-4 text-white" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <nav className="mt-8 border-t border-gray-800 pt-6" aria-label="ماركات شائعة">
            <h4 className="mb-3 text-sm font-bold text-white">سيارات حسب الماركة</h4>
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {POPULAR_MAKES.map((make) => (
                <li key={make}>
                  <Link to={`/listings?make=${encodeURIComponent(make)}`} className="text-gray-400 transition-colors hover:text-primary-400">
                    سيارات {make}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <span>© 2026 سوق السيارات الليبي - جميع الحقوق محفوظة</span>
              <VisitorCounter />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/privacy-policy" className="hover:text-primary-400 transition-colors">سياسة الخصوصية</Link>
              <Link to="/terms-of-use" className="hover:text-primary-400 transition-colors">شروط الاستخدام</Link>
              <Link to="/about" className="hover:text-primary-400 transition-colors">من نحن</Link>
              <button
                type="button"
                onClick={resetCookieConsent}
                className="flex items-center gap-1.5 hover:text-primary-400 transition-colors"
              >
                <Cookie className="w-3.5 h-3.5" />
                إعدادات الكوكيز
              </button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
