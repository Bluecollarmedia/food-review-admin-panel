import { createAdminClient } from "./supabase/admin";

// Per-IP bans live in the admin_settings row so the edge middleware can read
// them (via REST) and block a banned visitor before any page renders. The admin
// panel itself is never blocked, so the owner can't lock themselves out.

export type Bans = { ips: string[]; message: string };

export async function getBans(): Promise<Bans> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_settings")
    .select("banned_ips, ban_message")
    .eq("id", 1)
    .single();
  const ips = Array.isArray(data?.banned_ips)
    ? (data.banned_ips as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  return { ips, message: data?.ban_message ?? "" };
}

export async function getBanMessage(): Promise<string> {
  return (await getBans()).message;
}

export async function banIp(ip: string): Promise<void> {
  const clean = ip.trim();
  if (!clean) return;
  const supabase = createAdminClient();
  const { ips } = await getBans();
  if (ips.includes(clean)) return;
  await supabase
    .from("admin_settings")
    .update({ banned_ips: [...ips, clean] })
    .eq("id", 1);
}

export async function unbanIp(ip: string): Promise<void> {
  const supabase = createAdminClient();
  const { ips } = await getBans();
  await supabase
    .from("admin_settings")
    .update({ banned_ips: ips.filter((x) => x !== ip) })
    .eq("id", 1);
}

export async function setBanMessage(message: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("admin_settings")
    .update({ ban_message: message.trim() || null })
    .eq("id", 1);
}
