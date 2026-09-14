import { sharedStore } from "./blob-store";
import type { VisitorGeo } from "./visitors";

// Ban appeals + the one-time PINs that let an appealer unban themselves.

export type Appeal = {
  id: string;
  name: string;
  contact: string;
  message: string;
  selfieKey?: string; // R2 key of the live selfie
  faceVerified: boolean;
  deviceId: string;
  ips: string[];
  ip: string;
  geo?: VisitorGeo;
  createdAt: string;
  status: "new" | "handled";
};

function store() {
  return sharedStore("appeals");
}

const APPEAL_PREFIX = "a_";
const PIN_PREFIX = "pin_";
const PIN_TTL_MS = 1000 * 60 * 60 * 24; // a PIN is good for 24 hours

function randomId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createAppeal(
  input: Omit<Appeal, "id" | "createdAt" | "status">
): Promise<Appeal> {
  const appeal: Appeal = {
    ...input,
    id: randomId(),
    createdAt: new Date().toISOString(),
    status: "new",
  };
  await store().setJSON(APPEAL_PREFIX + appeal.id, appeal);
  return appeal;
}

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

export async function getAppeal(id: string): Promise<Appeal | null> {
  return (await store().get(APPEAL_PREFIX + id, { type: "json" })) as Appeal | null;
}

export async function setAppealStatus(id: string, status: Appeal["status"]): Promise<void> {
  const s = store();
  const a = (await s.get(APPEAL_PREFIX + id, { type: "json" })) as Appeal | null;
  if (a) {
    a.status = status;
    await s.setJSON(APPEAL_PREFIX + id, a);
  }
}

export async function deleteAppeal(id: string): Promise<void> {
  await store().delete(APPEAL_PREFIX + id);
}

// --- One-time unban PINs ---

type PinRecord = { deviceId: string; ips: string[]; expiresAt: number };

/** Make a short numeric PIN for a device and store it (24h, single use). */
export async function createUnbanPin(deviceId: string, ips: string[]): Promise<string> {
  const pin = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  const record: PinRecord = { deviceId, ips, expiresAt: Date.now() + PIN_TTL_MS };
  await store().setJSON(PIN_PREFIX + pin, record);
  return pin;
}

/** Look up a PIN; returns what to unban, or null if invalid/expired. Consumes it. */
export async function redeemUnbanPin(
  pin: string
): Promise<{ deviceId: string; ips: string[] } | null> {
  const s = store();
  const key = PIN_PREFIX + pin.trim();
  const record = (await s.get(key, { type: "json" })) as PinRecord | null;
  if (!record) return null;
  await s.delete(key); // one-time use
  if (record.expiresAt < Date.now()) return null;
  return { deviceId: record.deviceId, ips: record.ips };
}
