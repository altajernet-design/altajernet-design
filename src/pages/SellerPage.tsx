import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Car, Loader2, User } from 'lucide-react';
import { supabase, type Listing } from '../lib/supabase';
import { ListingCard } from '../components/ListingCard';
import { SITE_NAME, useDocumentMeta } from '../lib/seo';

export function SellerPage() {
  const { id } = useParams<{ id: string }>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentMeta({
    title: `إعلانات المعلن | ${SITE_NAME}`,
    description: 'كل إعلانات هذا المعلن على سوق السيارات الليبي.',
    path: `/seller/${id ?? ''}`,
    noindex: true,
  });

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    Promise.resolve(
      supabase
        .from('listings')
        .select('*, listing_categories(*), cities(*)')
        .eq('user_id', id)
        .eq('status', 'approved')
        .eq('is_sold', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(48),
    ).then(({ data }) => {
      if (!active) return;
      setListings((data ?? []) as Listing[]);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const since = listings.length > 0
    ? new Date(listings[listings.length - 1].created_at).toLocaleDateString('ar-LY', { year: 'numeric', month: 'long' })
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600"><User className="h-7 w-7" /></span>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">إعلانات المعلن</h1>
          {!loading && (
            <p className="text-sm text-gray-500">
              {listings.length.toLocaleString('ar-LY')} إعلان منشور{since ? ` · أول إعلان ظاهر: ${since}` : ''}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <Car className="mx-auto mb-4 h-14 w-14 text-gray-300" />
          <p className="mb-4 font-bold text-gray-700">لا توجد إعلانات منشورة لهذا المعلن حالياً</p>
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
