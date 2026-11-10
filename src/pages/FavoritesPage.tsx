import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import { supabase, type Listing } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ListingCard } from '../components/ListingCard';
import { useDocumentMeta } from '../lib/seo';

export function FavoritesPage() {
  useDocumentMeta({
    title: 'المفضلة | سوق السيارات الليبي',
    description: 'السيارات التي حفظتها في المفضلة.',
    path: '/favorites',
    noindex: true,
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate('/signin');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.resolve(
      supabase
        .from('favorites')
        .select('created_at, listings(*, listing_categories(*), cities(*))')
        .order('created_at', { ascending: false }),
    ).then(({ data }) => {
      if (!active) return;
      const rows = (data ?? []) as unknown as { listings: Listing | null }[];
      setListings(rows.map((row) => row.listings).filter((l): l is Listing => l !== null));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-800 md:text-3xl">المفضلة</h1>
      {listings.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <Heart className="mx-auto mb-4 h-14 w-14 text-gray-300" />
          <p className="mb-1 font-bold text-gray-700">لم تحفظ أي سيارة بعد</p>
          <p className="mb-5 text-sm text-gray-500">اضغط على القلب في أي إعلان لتجده هنا لاحقاً.</p>
          <Link to="/listings" className="inline-block rounded-xl bg-primary-600 px-6 py-3 font-bold text-white hover:bg-primary-700">تصفح الإعلانات</Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      )}
    </div>
  );
}
