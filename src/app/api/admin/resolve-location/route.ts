import { NextRequest, NextResponse } from "next/server";

const NJ = { lat: 40.09, lng: -74.22 };

function parseCoords(input: string): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|destination|center|daddr)=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\/(-?\d+\.\d+),(-?\d+\.\d+)/,
    /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/,
  ];
  for (const re of patterns) {
    const m = input.match(re);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

// ---- Google Places (New) — used only when a key is configured. Autocomplete
// uses a session token and Details requests only the `location` field, which is
// the cheapest billing tier, so admin usage stays within the free credit. ----
async function googleSuggest(query: string, key: string, sessionToken?: string) {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
    body: JSON.stringify({
      input: query,
      includedRegionCodes: ["us"],
      locationBias: {
        circle: { center: { latitude: NJ.lat, longitude: NJ.lng }, radius: 50000 },
      },
      ...(sessionToken ? { sessionToken } : {}),
    }),
  });
  const data = await res.json();
  // Surface Google's real reason (billing off, API not enabled, key restricted…)
  // instead of silently returning nothing.
  if (!res.ok) {
    return NextResponse.json(
      { results: [], error: data?.error?.message || `Google error ${res.status}` },
      { status: 200 }
    );
  }
  const results = (data.suggestions ?? [])
    .map((s: Record<string, unknown>) => {
      const p = s.placePrediction as
        | { placeId?: string; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } }; text?: { text?: string } }
        | undefined;
      if (!p?.placeId) return null;
      const main = p.structuredFormat?.mainText?.text ?? p.text?.text ?? "";
      const sec = p.structuredFormat?.secondaryText?.text ?? "";
      return { label: sec ? `${main}, ${sec}` : main, placeId: p.placeId };
    })
    .filter(Boolean);
  return NextResponse.json({ results });
}

async function googleDetails(placeId: string, key: string, sessionToken?: string) {
  const url =
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}` +
    (sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "");
  const res = await fetch(url, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location" },
  });
  const data = await res.json();
  const loc = data.location as { latitude?: number; longitude?: number } | undefined;
  if (!loc || typeof loc.latitude !== "number") {
    return NextResponse.json({ error: "Couldn't get that place." }, { status: 422 });
  }
  return NextResponse.json({ lat: loc.latitude, lng: loc.longitude });
}

// Free fallback: Photon (OSM) suggestions, biased to NJ.
async function photonSuggest(query: string) {
  if (query.length < 3) return NextResponse.json({ results: [] });
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=en&lat=${NJ.lat}&lon=${NJ.lng}`;
    const res = await fetch(url, { headers: { "User-Agent": "DSFoodReviews/1.0" } });
    const data = (await res.json()) as {
      features?: Array<{ geometry: { coordinates: [number, number] }; properties: Record<string, string> }>;
    };
    const results = (data.features ?? []).map((f) => {
      const p = f.properties;
      const label = [p.name, p.street, p.city ?? p.county, p.state]
        .filter((x, i, a) => x && a.indexOf(x) === i)
        .join(", ");
      return { label: label || p.name || "Unknown place", lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const sessionToken: string | undefined = body?.sessionToken;

  // Resolve a picked Google suggestion to coordinates.
  if (body?.placeId) {
    if (!key) return NextResponse.json({ error: "Google not configured." }, { status: 400 });
    return googleDetails(String(body.placeId), key, sessionToken);
  }

  const query: string = (body?.query ?? "").toString().trim();
  if (!query) return NextResponse.json({ error: "Empty query." }, { status: 400 });

  // Live suggestions.
  if (body?.suggest) {
    if (key) return googleSuggest(query, key, sessionToken);
    return photonSuggest(query);
  }

  // Direct coordinates or a full Maps URL.
  const direct = parseCoords(query);
  if (direct) return NextResponse.json({ ...direct });

  // A link (incl. short goo.gl) — follow redirects and scrape coords.
  if (/^https?:\/\//i.test(query)) {
    try {
      const res = await fetch(query, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; DSFoodReviews/1.0)" },
      });
      const fromUrl = parseCoords(res.url);
      if (fromUrl) return NextResponse.json({ ...fromUrl });
      const html = await res.text();
      const m = html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || html.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
      if (m) {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return NextResponse.json({ lat, lng });
      }
      return NextResponse.json({ error: "Couldn't read a location from that link." }, { status: 422 });
    } catch {
      return NextResponse.json({ error: "Couldn't open that link." }, { status: 422 });
    }
  }

  // Plain text fallback geocode (free).
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { "User-Agent": "DSFoodReviews/1.0 (admin location picker)" } }
    );
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (data.length === 0) return NextResponse.json({ error: "No match." }, { status: 404 });
    return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name });
  } catch {
    return NextResponse.json({ error: "Search failed." }, { status: 502 });
  }
}
