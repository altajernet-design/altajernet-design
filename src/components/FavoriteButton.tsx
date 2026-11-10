import { Heart } from 'lucide-react';
import { useFavorites } from '../lib/FavoritesContext';

type Props = {
  listingId: string;
  variant?: 'overlay' | 'inline';
};

export function FavoriteButton({ listingId, variant = 'overlay' }: Props) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(listingId);

  const base =
    variant === 'overlay'
      ? 'absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-all hover:scale-110'
      : 'flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50';

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggle(listingId);
      }}
      aria-pressed={active}
      aria-label={active ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      className={base}
    >
      <Heart className={`h-5 w-5 ${active ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
      {variant === 'inline' && <span>{active ? 'في المفضلة' : 'أضف للمفضلة'}</span>}
    </button>
  );
}
