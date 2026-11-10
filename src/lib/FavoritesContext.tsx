import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';
import { showToast } from '../components/Toast';

type FavoritesValue = {
  isFavorite: (listingId: string) => boolean;
  toggle: (listingId: string) => Promise<void>;
  count: number;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    let active = true;
    void Promise.resolve(supabase.from('favorites').select('listing_id')).then(({ data, error }) => {
      if (!active || error) return;
      setIds(new Set((data ?? []).map((row: { listing_id: string }) => row.listing_id)));
    });
    return () => {
      active = false;
    };
  }, [user]);

  const toggle = useCallback(
    async (listingId: string) => {
      if (!user) {
        showToast('سجّل الدخول لحفظ السيارة في المفضلة', 'error');
        navigate('/signin');
        return;
      }

      const wasFavorite = ids.has(listingId);
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(listingId);
        else next.add(listingId);
        return next;
      });

      const { error } = wasFavorite
        ? await supabase.from('favorites').delete().eq('listing_id', listingId).eq('user_id', user.id)
        : await supabase.from('favorites').insert({ listing_id: listingId });

      if (error) {
        setIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
        showToast('تعذر تحديث المفضلة. حاول مرة أخرى', 'error');
      } else {
        showToast(wasFavorite ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة إلى المفضلة');
      }
    },
    [ids, navigate, user],
  );

  const value = useMemo<FavoritesValue>(
    () => ({ isFavorite: (id) => ids.has(id), toggle, count: ids.size }),
    [ids, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider');
  return ctx;
}
