declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** The publisher id comes from the <meta name="google-adsense-account"> tag in index.html. */
export function getAdSenseClient(): string | null {
  const meta = document.head.querySelector<HTMLMetaElement>('meta[name="google-adsense-account"]');
  const value = meta?.content?.trim();
  return value && /^ca-pub-\d+$/.test(value) ? value : null;
}

/** Pulls the ad unit id out of the snippet the admin pasted into the site settings. */
export function extractAdSlot(snippet: string | null | undefined): string | null {
  if (!snippet) return null;
  const match = snippet.match(/data-ad-slot=["']?(\d{5,20})["']?/);
  return match ? match[1] : null;
}

export function loadAdSenseScript(): void {
  const client = getAdSenseClient();
  if (!client || document.querySelector('script[data-adsense-loader]')) return;

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  script.dataset.adsenseLoader = 'true';
  document.head.appendChild(script);
}
