import { useEffect } from 'react';

export const SITE_URL = 'https://sooqalsayarat.com';
export const SITE_NAME = 'سوق السيارات الليبي';
export const DEFAULT_IMAGE = `${SITE_URL}/cars-social-preview.jpg`;

type JsonLd = Record<string, unknown>;

type DocumentMeta = {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: JsonLd | JsonLd[];
  /** Keeps private or low-value pages (dashboard, sign-in, 404) out of search results. */
  noindex?: boolean;
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function useDocumentMeta({
  title,
  description,
  path,
  image,
  type = 'website',
  jsonLd,
  noindex = false,
}: DocumentMeta) {
  const jsonLdText = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    const imageUrl = image ?? DEFAULT_IMAGE;
    const previousTitle = document.title;

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertCanonical(url);

    let script: HTMLScriptElement | null = null;
    if (jsonLdText) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = jsonLdText;
      document.head.appendChild(script);
    }

    return () => {
      document.title = previousTitle;
      script?.remove();
    };
  }, [title, description, path, image, type, jsonLdText, noindex]);
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
