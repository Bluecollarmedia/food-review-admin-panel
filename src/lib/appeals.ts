import { getStore } from "@netlify/blobs";

// Ban appeals live in a Netlify Blobs store. NOTE: Blobs are scoped to each
// Netlify site, so appeals created on the main site are not visible here yet.
// This trimmed version only powers the nav badge count; the full Appeals tab
// (and a shared-data strategy) will be ported when that tab is built.

export type AppealGeo = {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  flag?: string;
};

export type Appeal = {
  id: string;
  name: string;
  contact: string;
  message: string;
  selfieKey?: string;
  faceVerified: boolean;
  deviceId: string;
  ips: string[];
  ip: string;
  geo?: AppealGeo;
  createdAt: string;
  status: "new" | "handled";
};

function store() {
  return getStore("appeals");
}

const APPEAL_PREFIX = "a_";

export async function listAppeals(): Promise<Appeal[]> {
  const s = store();
  const { blobs } = await s.list();
  const appeals = await Promise.all(
    blobs
      .filter((b) => b.key.startsWith(APPEAL_PREFIX))
      .map((b) => s.get(b.key, { type: "json" }) as Promise<Appeal>)
  );
  return appeals.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function countNewAppeals(): Promise<number> {
  const appeals = await listAppeals();
  return appeals.filter((a) => a.status === "new").length;
}
