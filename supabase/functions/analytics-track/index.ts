import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VisitPayload = {
  path?: unknown;
  listingId?: unknown;
  visitorKey?: unknown;
  referrer?: unknown;
};

type GeoResponse = {
  success?: boolean;
  city?: string;
  country?: string;
};

function response(body: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function deviceType(userAgent: string): "mobile" | "tablet" | "desktop" {
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobile|android|iphone|ipod/i.test(userAgent)) return "mobile";
  return "desktop";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  try {
    const payload = await req.json() as VisitPayload;
    const path = typeof payload.path === "string" ? payload.path.slice(0, 300) : "/";
    const visitorKey = typeof payload.visitorKey === "string" ? payload.visitorKey.slice(0, 120) : "";
    const listingId = typeof payload.listingId === "string" && uuidPattern.test(payload.listingId) ? payload.listingId : null;
    const referrer = typeof payload.referrer === "string" ? payload.referrer.slice(0, 180) : "";

    if (visitorKey.length < 16) return response({ error: "Invalid request" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Basic abuse protection: one visitor key cannot record more than 30 events per minute.
    const { count: recentEvents } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("visitor_key", visitorKey)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString());
    if ((recentEvents ?? 0) >= 30) return response({ error: "Too many requests" }, 429);

    const userAgent = req.headers.get("user-agent") ?? "";
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    let city = "غير معروف";
    let country = "غير معروف";

    if (ip) {
      try {
        const geoResponse = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
          signal: AbortSignal.timeout(1800),
        });
        if (geoResponse.ok) {
          const geo = await geoResponse.json() as GeoResponse;
          city = typeof geo.city === "string" && geo.city.length <= 120 ? geo.city : city;
          country = typeof geo.country === "string" && geo.country.length <= 120 ? geo.country : country;
        }
      } catch {
        city = "غير معروف";
        country = "غير معروف";
      }
    }

    const { error } = await supabase.from("analytics_events").insert({
      listing_id: listingId,
      path,
      city,
      country,
      device_type: deviceType(userAgent),
      visitor_key: visitorKey,
      referrer,
    });

    if (error) return response({ error: "Unable to record visit" }, 500);
    return response({ ok: "true" });
  } catch {
    return response({ error: "Unable to record visit" }, 500);
  }
});
