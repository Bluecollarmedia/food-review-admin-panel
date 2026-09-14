"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminUnlockForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!passcode.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/settings/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Incorrect passcode.");
      setBusy(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="w-full max-w-xs">
      <input
        value={passcode}
        onChange={(e) => setPasscode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        type="password"
        placeholder="Security passcode"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        autoFocus
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="mt-3 w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
      >
        {busy ? "Checking..." : "Unlock full admin"}
      </button>
      {error && <p className="mt-2 text-center text-xs text-primary">{error}</p>}
    </div>
  );
}
