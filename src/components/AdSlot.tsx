import { useEffect, useRef } from 'react';
import { useCookieConsent } from '../lib/consent';
import { useSiteSettings } from '../lib/siteSettings';
import { extractAdSlot, getAdSenseClient, loadAdSenseScript } from '../lib/adsense';

/**
 * Loads the AdSense script once the visitor accepts cookies (this also enables Auto ads),
 * and renders nothing visible.
 */
export function AdSenseLoader() {
  const consent = useCookieConsent();

  useEffect(() => {
    if (consent === 'granted') loadAdSenseScript();
  }, [consent]);

  return null;
}

/**
 * A manual ad unit. The unit id is read from the AdSense snippet saved in the admin
 * settings (data-ad-slot). Without a saved unit id nothing is rendered, so there is no
 * empty box; Auto ads placed by Google still work.
 */
export function AdSlot({ className = '' }: { className?: string }) {
  const consent = useCookieConsent();
  const settings = useSiteSettings();
  const pushed = useRef(false);

  const client = typeof document === 'undefined' ? null : getAdSenseClient();
  const slot = extractAdSlot(settings?.adsense_code);
  const ready = consent === 'granted' && Boolean(client) && Boolean(slot);

  useEffect(() => {
    if (!ready || pushed.current) return;
    pushed.current = true;
    loadAdSenseScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense can throw when the unit is already filled; nothing to recover.
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <div className={`overflow-hidden ${className}`} aria-label="إعلان">
      <p className="mb-1 text-center text-[11px] text-gray-400">إعلان</p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client ?? undefined}
        data-ad-slot={slot ?? undefined}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
