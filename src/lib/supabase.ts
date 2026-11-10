import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
};

export type Service = {
  id: string;
  title: string;
  description: string;
  price: number;
  category_id: string | null;
  user_id: string;
  city: string | null;
  phone: string | null;
  status: string;
  image_url: string | null;
  created_at: string;
  categories?: Category;
};

export type ServiceRequest = {
  id: string;
  service_id: string;
  requester_id: string;
  message: string;
  status: string;
  created_at: string;
  services?: Service;
};

export type City = {
  id: string;
  name: string;
  sort_order: number;
};

export type ListingCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
};

export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number | null;
  is_negotiable: boolean;
  year: number | null;
  mileage_km: number | null;
  category_id: string | null;
  city_id: string | null;
  user_id: string;
  ad_type: string;
  phone: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  listing_categories?: ListingCategory;
  cities?: City;
  car_make: string | null;
  car_model: string | null;
  fuel_type: string | null;
  transmission: string | null;
  color: string | null;
  condition: string | null;
  body_type: string | null;
  customs_status: string | null;
  is_sold: boolean;
  sold_at: string | null;
  expires_at: string;
  views_count: number;
  property_type: string | null;
  clothing_audience: string | null;
  listing_images?: ListingImage[];
};

export type ListingReport = {
  id: string;
  listing_id: string;
  reporter_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  listings?: { id: string; title: string; status: string } | null;
};

export type ListingImage = {
  id: string;
  listing_id: string;
  image_url: string;
  sort_order: number;
  created_at: string;
};

export type ListingContactMessage = {
  id: string;
  listing_id: string;
  seller_id: string;
  sender_id: string | null;
  sender_name: string;
  sender_contact: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

export type Profile = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

export type SiteSettings = {
  id: number;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  social_whatsapp: string;
  social_telegram: string;
  social_youtube: string;
  adsense_code: string;
  logo_url: string;
  privacy_policy: string;
  terms_of_use: string;
  updated_at: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  meta_title: string;
  meta_description: string;
  status: 'draft' | 'published';
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
};
