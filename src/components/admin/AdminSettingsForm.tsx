"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BannerDuration = "none" | "24h" | "1w";
type SiteLockMode = "off" | "full" | "code";
type PassMode = "keep" | "change" | "remove";

function SettingsSection({
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-foreground/[0.02]"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 truncate text-xs text-foreground/50">{summary}</p>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className={`h-5 w-5 shrink-0 text-foreground/40 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && <div className="border-t border-border px-4 py-4">{children}</div>}
    </div>
  );
}

function PasscodeField({
  label,
  description,
  isSet,
  mode,
  value,
  onMode,
  onValue,
}: {
  label: string;
  description: string;
  isSet: boolean;
  mode: PassMode;
  value: string;
  onMode: (mode: PassMode) => void;
  onValue: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-foreground/50">{description}</p>
        </div>
        {mode === "keep" && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isSet ? "bg-emerald-100 text-emerald-700" : "bg-foreground/10 text-foreground/50"
            }`}
          >
            {isSet ? "Set" : "Not set"}
          </span>
        )}
      </div>

      {mode === "keep" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onMode("change")}
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground/70 hover:border-primary hover:text-primary"
          >
            {isSet ? "Change" : "Set a passcode"}
          </button>
          {isSet && (
            <button
              type="button"
              onClick={() => onMode("remove")}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white"
            >
              Remove
            </button>
          )}
        </div>
      ) : mode === "change" ? (
        <div className="mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={value}
              onChange={(e) => onValue(e.target.value)}
              type="text"
              placeholder={`New ${label.toLowerCase()}`}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => {
                onMode("keep");
                onValue("");
              }}
              className="text-xs font-semibold text-foreground/50 hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          <p className="mt-1 text-[11px] text-foreground/50">
            Takes effect when you press Save below.
          </p>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-primary">
            Will be removed when you Save.
          </span>
          <button
            type="button"
            onClick={() => onMode("keep")}
            className="text-xs font-semibold text-foreground/60 hover:text-foreground"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminSettingsForm({
  initialEmailNotifications,
  initialNotifyEmail,
  initialUnlocked,
  lockedPasscodeSet,
  vaultPasscodeSet,
  settingsPasscodeSet,
  initialBannerMessage,
  initialBannerExpiresAt,
  initialSiteLockMode,
  initialSiteLockPasscode,
  initialSiteLockPasscode2,
  initialSiteLockHint,
  initialRequireApproval,
}: {
  initialEmailNotifications: boolean;
  initialNotifyEmail: string;
  initialUnlocked: boolean;
  lockedPasscodeSet: boolean;
  vaultPasscodeSet: boolean;
  settingsPasscodeSet: boolean;
  initialBannerMessage: string;
  initialBannerExpiresAt: string | null;
  initialSiteLockMode: SiteLockMode;
  initialSiteLockPasscode: string;
  initialSiteLockPasscode2: string;
  initialSiteLockHint: string;
  initialRequireApproval: boolean;
}) {
  const router = useRouter();

  // Only one section is open at a time, and everything starts closed — so the
  // page is a short list of taps, not a wall of controls.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const toggle = (key: string) => setOpenKey((cur) => (cur === key ? null : key));

  const [emailNotifications, setEmailNotifications] = useState(initialEmailNotifications);
  const [notifyEmail, setNotifyEmail] = useState(initialNotifyEmail);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [bannerMessage, setBannerMessage] = useState(initialBannerMessage);
  const [bannerDuration, setBannerDuration] = useState<BannerDuration>("none");

  const [siteLockMode, setSiteLockMode] = useState<SiteLockMode>(initialSiteLockMode);
  const [siteLockPasscode, setSiteLockPasscode] = useState(initialSiteLockPasscode);
  const [siteLockPasscode2, setSiteLockPasscode2] = useState(initialSiteLockPasscode2);
  const [siteLockHint, setSiteLockHint] = useState(initialSiteLockHint);
  const [requireApproval, setRequireApproval] = useState(initialRequireApproval);

  // Passcodes — we only know whether each is set, never its value.
  const unlocked = initialUnlocked;
  const [lockedIsSet, setLockedIsSet] = useState(lockedPasscodeSet);
  const [vaultIsSet, setVaultIsSet] = useState(vaultPasscodeSet);
  const [settingsIsSet, setSettingsIsSet] = useState(settingsPasscodeSet);
  const [lockedMode, setLockedMode] = useState<PassMode>("keep");
  const [vaultMode, setVaultMode] = useState<PassMode>("keep");
  const [settingsMode, setSettingsMode] = useState<PassMode>("keep");
  const [lockedValue, setLockedValue] = useState("");
  const [vaultValue, setVaultValue] = useState("");
  const [settingsValue, setSettingsValue] = useState("");

  const [unlockInput, setUnlockInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function sendTestEmail() {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: notifyEmail }),
      });
      const d = await res.json().catch(() => null);
      if (d?.ok) {
        setTestMsg({ ok: true, text: `Sent to ${d.to}. Check your inbox and spam folder. (From: ${d.from})` });
      } else {
        setTestMsg({ ok: false, text: d?.error ?? "Couldn't send the test email." });
      }
    } catch {
      setTestMsg({ ok: false, text: "Couldn't reach the server." });
    } finally {
      setTesting(false);
    }
  }

  async function handleUnlock() {
    setUnlocking(true);
    setUnlockError("");
    const res = await fetch("/api/admin/settings/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: unlockInput }),
    });
    setUnlocking(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setUnlockError(data?.error ?? "Incorrect passcode.");
      return;
    }
    router.refresh();
  }

  const existingExpiry =
    initialBannerExpiresAt && new Date(initialBannerExpiresAt).getTime() > Date.now()
      ? new Date(initialBannerExpiresAt)
      : null;

  function passcodePayload(mode: PassMode, value: string): { include: boolean; value: string } {
    if (mode === "change" && value.trim()) return { include: true, value: value.trim() };
    if (mode === "remove") return { include: true, value: "" };
    return { include: false, value: "" };
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");

    const body: Record<string, unknown> = {
      emailNotifications,
      notifyEmail,
      bannerMessage,
      bannerDuration,
      siteLockMode,
      siteLockPasscode,
      siteLockPasscode2,
      siteLockHint,
      requireApproval,
    };

    if (unlocked) {
      const locked = passcodePayload(lockedMode, lockedValue);
      const vault = passcodePayload(vaultMode, vaultValue);
      const security = passcodePayload(settingsMode, settingsValue);
      if (locked.include) body.lockedPasscode = locked.value;
      if (vault.include) body.vaultPasscode = vault.value;
      if (security.include) body.settingsPasscode = security.value;
    }

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Couldn't save. Try again.");
      return;
    }

    if (unlocked) {
      if (lockedMode === "change" && lockedValue.trim()) setLockedIsSet(true);
      if (lockedMode === "remove") setLockedIsSet(false);
      if (vaultMode === "change" && vaultValue.trim()) setVaultIsSet(true);
      if (vaultMode === "remove") setVaultIsSet(false);
      if (settingsMode === "change" && settingsValue.trim()) setSettingsIsSet(true);
      if (settingsMode === "remove") setSettingsIsSet(false);
      setLockedMode("keep");
      setVaultMode("keep");
      setSettingsMode("keep");
      setLockedValue("");
      setVaultValue("");
      setSettingsValue("");
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const durationOptions: { value: BannerDuration; label: string }[] = [
    { value: "none", label: "Until I remove it" },
    { value: "24h", label: "24 hours" },
    { value: "1w", label: "1 week" },
  ];

  const lockOptions: { value: SiteLockMode; label: string; hint: string }[] = [
    { value: "off", label: "Off", hint: "Site open to everyone (normal)." },
    { value: "full", label: "Full lockdown", hint: "Whole site closed — visitors see a friendly “we’ll be right back” screen." },
    { value: "code", label: "Locked with a code", hint: "Visitors need a passcode to get in." },
  ];

  // Short at-a-glance status shown on each collapsed row.
  const notifSummary = notifyEmail ? notifyEmail : "No email set";
  const bannerSummary = bannerMessage.trim() ? "Showing a message" : "None";
  const lockSummary =
    siteLockMode === "full"
      ? "Full lockdown"
      : siteLockMode === "code"
      ? "Locked with a code"
      : "Off · site open to everyone";
  const passSummary = !unlocked
    ? "🔒 Protected — passcode required"
    : `Locked ${lockedIsSet ? "✓" : "—"} · Vault ${vaultIsSet ? "✓" : "—"} · Security ${
        settingsIsSet ? "✓" : "—"
      }`;

  return (
    <div className="mt-6 flex flex-col gap-3">
      {/* Notifications */}
      <SettingsSection
        title="Notifications"
        summary={notifSummary}
        isOpen={openKey === "notif"}
        onToggle={() => toggle("notif")}
      >
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Send my notifications to
        </label>
        <input
          value={notifyEmail}
          onChange={(e) => setNotifyEmail(e.target.value)}
          type="email"
          placeholder="you@example.com"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <p className="mt-1.5 text-xs text-foreground/60">
          New account requests and ban appeals are always emailed here. Save after changing it.
        </p>

        <div className="mt-3">
          <button
            type="button"
            onClick={sendTestEmail}
            disabled={testing}
            className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-foreground/70 hover:border-primary hover:text-primary disabled:opacity-60"
          >
            {testing ? "Sending…" : "Send test email"}
          </button>
          {testMsg && (
            <p className={`mt-2 text-xs ${testMsg.ok ? "text-emerald-600" : "text-primary"}`}>
              {testMsg.text}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Also email me about comments</p>
            <p className="mt-0.5 text-xs text-foreground/60">
              Get an email every time someone comments or replies.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEmailNotifications((v) => !v)}
            aria-pressed={emailNotifications}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              emailNotifications ? "bg-primary" : "bg-foreground/20"
            }`}
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                emailNotifications ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </SettingsSection>

      {/* Announcement */}
      <SettingsSection
        title="Announcement screen"
        summary={bannerSummary}
        isOpen={openKey === "banner"}
        onToggle={() => toggle("banner")}
      >
        <p className="text-xs text-foreground/60">
          Whatever you write here shows as a full branded welcome screen — logo and all — the first
          time someone opens the site. They tap “Continue” to go in. Leave it empty to take it down.
        </p>
        <textarea
          value={bannerMessage}
          onChange={(e) => setBannerMessage(e.target.value)}
          rows={4}
          maxLength={600}
          placeholder="e.g. Emergency meeting tonight at 8pm about the scoreboard. New videos are paused until Sunday — thanks for bearing with us!"
          className="mt-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        {bannerMessage.trim() && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-foreground/70">
              Take it down automatically after:
            </p>
            <div className="flex flex-wrap gap-2">
              {durationOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBannerDuration(opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    bannerDuration === opt.value
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-foreground/70"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {existingExpiry && (
              <p className="mt-2 text-xs text-foreground/50">
                Currently set to disappear on {existingExpiry.toLocaleString()}. Pick an option
                above and save to change it.
              </p>
            )}
          </div>
        )}
      </SettingsSection>

      {/* Site lockdown */}
      <SettingsSection
        title="Lock the whole site"
        summary={lockSummary}
        isOpen={openKey === "lock"}
        onToggle={() => toggle("lock")}
      >
        <p className="text-xs text-foreground/60">
          Closes the entire public site in one switch. You&apos;re never locked out — the admin
          panel always stays open so you can turn it back off.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {lockOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSiteLockMode(opt.value)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                siteLockMode === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  siteLockMode === opt.value ? "border-primary" : "border-foreground/30"
                }`}
              >
                {siteLockMode === opt.value && <span className="h-2 w-2 rounded-full bg-primary" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
                <span className="block text-xs text-foreground/60">{opt.hint}</span>
              </span>
            </button>
          ))}
        </div>
        {siteLockMode === "code" && (
          <div className="mt-3 flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground/70">
                Passcode 1
              </label>
              <input
                value={siteLockPasscode}
                onChange={(e) => setSiteLockPasscode(e.target.value)}
                type="text"
                placeholder="e.g. a code for your friends"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground/70">
                Passcode 2 (optional)
              </label>
              <input
                value={siteLockPasscode2}
                onChange={(e) => setSiteLockPasscode2(e.target.value)}
                type="text"
                placeholder="e.g. a different code for someone special"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-[11px] text-foreground/50">
                Either passcode lets someone in — hand out different ones to different people.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-foreground/70">
                Hint (optional)
              </label>
              <input
                value={siteLockHint}
                onChange={(e) => setSiteLockHint(e.target.value)}
                type="text"
                placeholder="e.g. My favorite color / July's nickname"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-[11px] text-foreground/50">
                Shown on the lock screen to help close friends remember the passcode.
              </p>
            </div>
          </div>
        )}
      </SettingsSection>

      {/* Members-only */}
      <SettingsSection
        title="Members-only (approve accounts)"
        summary={requireApproval ? "On · accounts need your approval" : "Off · anyone can view"}
        isOpen={openKey === "members"}
        onToggle={() => toggle("members")}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Require an approved account</p>
            <p className="mt-0.5 text-xs text-foreground/60">
              When on, the whole site needs a logged-in account that YOU&apos;ve approved. New
              signups wait in the Accounts tab until you approve them. Everyone already signed in
              stays in.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRequireApproval((v) => !v)}
            aria-pressed={requireApproval}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              requireApproval ? "bg-primary" : "bg-foreground/20"
            }`}
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                requireApproval ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="mt-3 text-[11px] text-foreground/50">
          Manage who&apos;s in from the <span className="font-semibold">Accounts</span> tab —
          approve, suspend, or remove people there.
        </p>
      </SettingsSection>

      {/* Advanced: video passcodes */}
      <SettingsSection
        title="Video passcodes · advanced"
        summary={passSummary}
        isOpen={openKey === "pass"}
        onToggle={() => toggle("pass")}
      >
        {unlocked ? (
          <>
            <p className="text-xs text-foreground/60">
              The codes that unlock your hidden videos. For safety the current codes are never
              shown — set a new one to change it. Anyone using an old code will need the new one.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <PasscodeField
                label="Locked passcode"
                description="Opens the regular Locked section."
                isSet={lockedIsSet}
                mode={lockedMode}
                value={lockedValue}
                onMode={setLockedMode}
                onValue={setLockedValue}
              />
              <PasscodeField
                label="Vault passcode"
                description="The second, deeper code — for videos inside the Vault."
                isSet={vaultIsSet}
                mode={vaultMode}
                value={vaultValue}
                onMode={setVaultMode}
                onValue={setVaultValue}
              />
              <PasscodeField
                label="Security passcode"
                description="Guards this section. Anyone with admin access can upload, but only someone who knows this can see or change the codes above. Remove it to leave this section open."
                isSet={settingsIsSet}
                mode={settingsMode}
                value={settingsValue}
                onMode={setSettingsMode}
                onValue={setSettingsValue}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-foreground/60">
              🔒 Protected. Enter the security passcode to view or change the Locked and Vault
              passcodes.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={unlockInput}
                onChange={(e) => setUnlockInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                type="password"
                placeholder="Security passcode"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleUnlock}
                disabled={unlocking}
                className="shrink-0 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background transition-colors disabled:opacity-60"
              >
                {unlocking ? "Checking..." : "Unlock"}
              </button>
            </div>
            {unlockError && <p className="mt-2 text-xs text-primary">{unlockError}</p>}
          </>
        )}
      </SettingsSection>

      {/* Save */}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save all settings"}
        </button>
        {error && <p className="text-xs text-primary">{error}</p>}
        {saved && <p className="text-xs font-semibold text-emerald-600">Saved ✓</p>}
      </div>
    </div>
  );
}
