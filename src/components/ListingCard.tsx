import { Link } from 'react-router-dom';
import { MapPin, Car, Fuel, Settings, Gauge, Calendar } from 'lucide-react';
import type { Listing } from '../lib/supabase';
import { getPriceDisplay } from '../lib/listingPrice';
import { FUEL_TYPES, TRANSMISSION_TYPES, formatMileage, isExpired, labelOf, timeAgo } from '../lib/carData';
import { FavoriteButton } from './FavoriteButton';

type Props = {
  listing: Listing;
  variant?: 'default' | 'home';
  /** Marks the first cards of a page so the browser loads their images immediately. */
  priority?: boolean;
};

export function ListingCard({ listing, variant = 'default', priority = false }: Props) {
  const isRent = listing.ad_type === 'rent';
  const price = getPriceDisplay(listing.price, listing.is_negotiable);
  const sold = listing.is_sold;
  const expired = isExpired(listing.expires_at);
  const makeModel = [listing.car_make, listing.car_model].filter(Boolean).join(' ');

  const specs = [
    listing.year ? { icon: Calendar, text: String(listing.year) } : null,
    formatMileage(listing.mileage_km) ? { icon: Gauge, text: formatMileage(listing.mileage_km) as string } : null,
    labelOf(FUEL_TYPES, listing.fuel_type) ? { icon: Fuel, text: labelOf(FUEL_TYPES, listing.fuel_type) as string } : null,
    labelOf(TRANSMISSION_TYPES, listing.transmission)
      ? { icon: Settings, text: labelOf(TRANSMISSION_TYPES, listing.transmission) as string }
      : null,
  ].filter((spec): spec is { icon: typeof Calendar; text: string } => spec !== null);

  const imageFit = variant === 'home' ? 'object-contain p-2' : 'object-cover';
  const imageBg = variant === 'home' ? 'bg-gray-100' : 'bg-gradient-to-br from-accent-100 to-accent-200';

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:border-primary-200 hover:shadow-xl animate-fade-in">
      <FavoriteButton listingId={listing.id} />

      <Link to={`/listing/${listing.id}`} className="block" aria-label={listing.title}>
        <div className={`relative aspect-[4/3] overflow-hidden ${imageBg}`}>
          {listing.image_url ? (
            <img
              src={listing.image_url}
              alt={listing.title}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className={`h-full w-full ${imageFit} transition-transform duration-500 group-hover:scale-105 ${sold ? 'opacity-60 grayscale' : ''}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Car className="h-16 w-16 text-accent-300" />
            </div>
          )}

          <span
            className={`absolute right-3 top-3 rounded-lg px-2.5 py-1 text-xs font-bold shadow-sm ${
              isRent ? 'bg-blue-600 text-white' : 'bg-primary-600 text-white'
            }`}
          >
            {isRent ? 'للإيجار' : 'للبيع'}
          </span>

          {(sold || expired) && (
            <span className="absolute bottom-3 right-3 rounded-lg bg-gray-900/85 px-3 py-1 text-xs font-bold text-white">
              {sold ? 'تم البيع' : 'انتهى الإعلان'}
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="mb-0.5 line-clamp-1 text-base font-bold text-gray-900 transition-colors group-hover:text-primary-700">
            {listing.title}
          </h3>
          {makeModel && <p className="mb-2 line-clamp-1 text-sm text-gray-500">{makeModel}</p>}

          {specs.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              {specs.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5 text-gray-400" />
                  {text}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end justify-between gap-3 border-t border-gray-100 pt-3">
            <div>
              {price.amount ? (
                <p className="flex items-baseline gap-1 text-lg font-extrabold text-accent-600">
                  {price.amount}
                  <span className="text-xs font-semibold text-gray-400">{price.label}</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-accent-600">{price.label}</p>
              )}
              {price.amount && listing.is_negotiable && <p className="text-[11px] text-gray-400">قابل للتفاوض</p>}
            </div>
            <div className="text-left text-xs text-gray-400">
              {listing.cities?.name && (
                <p className="flex items-center justify-end gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {listing.cities.name}
                </p>
              )}
              <p>{timeAgo(listing.created_at)}</p>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
