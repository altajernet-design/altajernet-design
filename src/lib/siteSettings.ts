import { useEffect, useState } from 'react';
import { supabase, type SiteSettings } from './supabase';

let cached: SiteSettings | null | undefined;
let inflight: Promise<SiteSettings | null> | null = null;

function loadSettings(): Promise<SiteSettings | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  if (!inflight) {
    inflight = Promise.resolve(
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    )
      .then(({ data }) => {
        cached = (data as SiteSettings | null) ?? null;
        return cached;
      })
      .catch(() => {
        cached = null;
        return null;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Site settings are read once per page load and shared by every component that needs them. */
export function useSiteSettings(): SiteSettings | null {
  const [settings, setSettings] = useState<SiteSettings | null>(cached ?? null);

  useEffect(() => {
    let active = true;
    void loadSettings().then((value) => {
      if (active) setSettings(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return settings;
}
