import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_NAME = "سوق السيارات الليبي";
const DEFAULT_TITLE = "سوق السيارات الليبي - إعلانات السيارات في ليبيا";
const DEFAULT_DESCRIPTION = "بيع وشراء وتأجير السيارات وقطع الغيار في مختلف المدن الليبية.";
const DEFAULT_IMAGE = "https://sooqalsayarat.com/cars-social-preview.jpg";
const SITE_URL = "https://sooqalsayarat.com";

const FALLBACK_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${DEFAULT_TITLE}</title>
<meta name="description" content="${DEFAULT_DESCRIPTION}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="${SITE_NAME}"/>
<meta property="og:title" content="${DEFAULT_TITLE}"/>
<meta property="og:description" content="${DEFAULT_DESCRIPTION}"/>
<meta property="og:image" content="${DEFAULT_IMAGE}"/>
<meta property="og:url" content="${SITE_URL}/"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${DEFAULT_TITLE}"/>
<meta name="twitter:description" content="${DEFAULT_DESCRIPTION}"/>
<meta name="twitter:image" content="${DEFAULT_IMAGE}"/>
<meta http-equiv="refresh" content="0;url=${SITE_URL}/"/>
</head>
<body></body>
</html>`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const listingId = url.searchParams.get("listingId");

  if (!listingId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId)) {
    return new Response(FALLBACK_HTML, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data, error } = await supabase
      .from("listings")
      .select("title, description, price, ad_type, image_url, status, listing_images(image_url, sort_order)")
      .eq("id", listingId)
      .maybeSingle();

    if (error || !data || data.status !== "approved") {
      return new Response(FALLBACK_HTML, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const images = [
      ...(data.listing_images ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((i: { image_url: string }) => i.image_url),
      ...(data.image_url ? [data.image_url] : []),
    ];
    const imageUrl = images[0] ?? DEFAULT_IMAGE;
    const adTypeLabel = data.ad_type === "rent" ? "للإيجار" : "للبيع";
    const priceLabel = Number(data.price) > 0
      ? `${Number(data.price).toLocaleString("ar-LY")} د.ل`
      : "قابل للتفاوض";
    const title = truncate(`${data.title} | ${adTypeLabel} - ${SITE_NAME}`, 90);
    const description = truncate(
      `${priceLabel}${data.description ? ` - ${data.description}` : ""}`,
      180,
    );

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="${SITE_NAME}"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
<meta property="og:image" content="${escapeHtml(imageUrl)}"/>
<meta property="og:url" content="${SITE_URL}/listing/${escapeHtml(listingId)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escapeHtml(title)}"/>
<meta name="twitter:description" content="${escapeHtml(description)}"/>
<meta name="twitter:image" content="${escapeHtml(imageUrl)}"/>
<meta http-equiv="refresh" content="0;url=${SITE_URL}/listing/${escapeHtml(listingId)}"/>
</head>
<body></body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (_err) {
    return new Response(FALLBACK_HTML, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
