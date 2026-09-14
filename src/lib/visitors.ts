import { sharedStore } from "./blob-store";

// A visitor log grouped by DEVICE, not IP. Each browser sends a stable id, so a
// phone that cycles through a dozen IPs (as cellular does) is still one visitor.
// The IPs/locations a device has used are tracked inside its record.

const MAX_HITS = 150; // recent visits kept per device
const MAX_LOCATIONS = 25; // distinct IPs/places kept per device

// Reloading the same page within this window doesn't count as a new visit.
const DEDUPE_MS = 45_000;

export type VisitorHit = { t: string; p: string; ip: string };

export type VisitorGeo = {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  org?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  flag?: string;
};

export type VisitorLocation = {
  ip: string;
  geo?: VisitorGeo;
  count: number;
  lastSeen: string;
};

export type VisitorRecord = {
  id: string;
  label?: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  hits: VisitorHit[]; // most recent first, capped
  locations: VisitorLocation[]; // distinct IPs/places, most recent first
};

type VisitorConfig = { hidden: string[] }; // hidden device ids

function store() {
  return sharedStore("visitors");
}

const CONFIG_KEY = "config";

function keyFor(id: string): string {
  return "v_" + id.replace(/[^a-zA-Z0-9]/g, "_");
}

function isPrivateIp(ip: string): boolean {
  return (
    !ip ||
    ip === "unknown" ||
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

async function lookupGeo(ip: string): Promise<VisitorGeo | null> {
  if (isPrivateIp(ip)) return null;
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      success?: boolean;
      city?: string;
      region?: string;
      country?: string;
      country_code?: string;
      latitude?: number;
      longitude?: number;
      connection?: { isp?: string; org?: string };
      timezone?: { id?: string };
      flag?: { emoji?: string };
    };
    if (!d || d.success === false) return null;
    return {
      city: d.city,
      region: d.region,
      country: d.country,
      countryCode: d.country_code,
      isp: d.connection?.isp,
      org: d.connection?.org,
      lat: d.latitude,
      lon: d.longitude,
      timezone: d.timezone?.id,
      flag: d.flag?.emoji,
    };
  } catch {
    return null;
  }
}

export async function recordVisit(id: string, ip: string, path: string): Promise<void> {
  const visitorId = id || (ip ? `ip:${ip}` : "");
  if (!visitorId) return;

  const s = store();
  const key = keyFor(visitorId);
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const cleanPath = path || "/";
  const cleanIp = ip || "unknown";
  const hit: VisitorHit = { t: now, p: cleanPath, ip: cleanIp };

  const existing = (await s.get(key, { type: "json" })) as VisitorRecord | null;

  if (existing) {
    const last = existing.hits[0];
    const isRefresh =
      last && last.p === cleanPath && last.ip === cleanIp && nowMs - new Date(last.t).getTime() < DEDUPE_MS;

    if (!isRefresh) {
      existing.count += 1;
      existing.hits = [hit, ...existing.hits].slice(0, MAX_HITS);
    }
    existing.lastSeen = now;

    if (!existing.locations) existing.locations = [];
    const loc = existing.locations.find((l) => l.ip === cleanIp);
    if (loc) {
      if (!isRefresh) loc.count += 1;
      loc.lastSeen = now;
      // move to front
      existing.locations = [loc, ...existing.locations.filter((l) => l.ip !== cleanIp)];
    } else {
      const geo = await lookupGeo(cleanIp);
      existing.locations = [
        { ip: cleanIp, geo: geo ?? undefined, count: 1, lastSeen: now },
        ...existing.locations,
      ].slice(0, MAX_LOCATIONS);
    }

    await s.setJSON(key, existing);
    return;
  }

  const geo = await lookupGeo(cleanIp);
  const record: VisitorRecord = {
    id: visitorId,
    count: 1,
    firstSeen: now,
    lastSeen: now,
    hits: [hit],
    locations: [{ ip: cleanIp, geo: geo ?? undefined, count: 1, lastSeen: now }],
  };
  await s.setJSON(key, record);
}

export async function listVisitors(): Promise<VisitorRecord[]> {
  const s = store();
  const { blobs } = await s.list();
  const records = await Promise.all(
    blobs
      .filter((b) => b.key.startsWith("v_"))
      .map((b) => s.get(b.key, { type: "json" }) as Promise<VisitorRecord>)
  );
  return records
    .filter(Boolean)
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}

async function getConfig(): Promise<VisitorConfig> {
  const c = (await store().get(CONFIG_KEY, { type: "json" })) as VisitorConfig | null;
  return c && Array.isArray(c.hidden) ? c : { hidden: [] };
}

export async function getHiddenVisitors(): Promise<string[]> {
  return (await getConfig()).hidden;
}

export async function hideVisitor(id: string): Promise<void> {
  const config = await getConfig();
  if (!config.hidden.includes(id)) {
    config.hidden.push(id);
    await store().setJSON(CONFIG_KEY, config);
  }
}

export async function unhideVisitor(id: string): Promise<void> {
  const config = await getConfig();
  config.hidden = config.hidden.filter((x) => x !== id);
  await store().setJSON(CONFIG_KEY, config);
}

export async function setLabel(id: string, label: string): Promise<void> {
  const s = store();
  const key = keyFor(id);
  const record = (await s.get(key, { type: "json" })) as VisitorRecord | null;
  if (record) {
    record.label = label.trim() || undefined;
    await s.setJSON(key, record);
  }
}

export async function clearVisitor(id: string): Promise<void> {
  await store().delete(keyFor(id));
  await unhideVisitor(id);
}

export async function clearAllVisitors(): Promise<void> {
  const s = store();
  const { blobs } = await s.list();
  await Promise.all(
    blobs
      .filter((b) => b.key.startsWith("v_") || b.key.startsWith("ip_"))
      .map((b) => s.delete(b.key))
  );
}
