import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SITE_URL = "https://sooqalsayarat.com";
const STATIC_PATHS = ["/", "/listings", "/blog", "/about", "/privacy-policy", "/terms-of-use"];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(path: string, lastmod: string | null, priority: string): string {
  const lastmodTag = lastmod ? `<lastmod>${escapeXml(lastmod.slice(0, 10))}</lastmod>` : "";
  return `  <url><loc>${escapeXml(`${SITE_URL}${path}`)}</loc>${lastmodTag}<priority>${priority}</priority></url>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const [listingsResult, postsResult] = await Promise.all([
      supabase
        .from("listings")
        .select("id, created_at")
        .eq("status", "approved")
        .eq("is_sold", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase
        .from("blog_posts")
        .select("slug, updated_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(5000),
    ]);

    if (listingsResult.error || postsResult.error) {
      throw new Error(listingsResult.error?.message ?? postsResult.error?.message);
    }

    const entries = [
      ...STATIC_PATHS.map((path) => urlEntry(path, null, path === "/" ? "1.0" : "0.6")),
      ...(listingsResult.data ?? []).map((listing) =>
        urlEntry(`/listing/${listing.id}`, listing.created_at, "0.7"),
      ),
      ...(postsResult.data ?? []).map((post) =>
        urlEntry(`/blog/${encodeURIComponent(post.slug)}`, post.updated_at, "0.8"),
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("sitemap generation failed", error);
    return new Response(JSON.stringify({ error: "Could not build sitemap" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
