"use client";

import { useState } from "react";

export default function PushComposer({ recipientCount }: { recipientCount: number }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending;

  async function handleSend() {
    if (!canSend) return;
    const confirmed = window.confirm(
      `Send this notification to ${recipientCount} ${
        recipientCount === 1 ? "person" : "people"
      } right now?\n\n"${title}"\n${body}`
    );
    if (!confirmed) return;

    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Failed to send.");
      } else {
        setResult({ sent: data.sent, failed: data.failed });
        setTitle("");
        setBody("");
      }
    } catch {
      setError("Network error — nothing was sent.");
    }
    setSending(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm text-foreground/60">
        This sends an immediate push notification to every device with notifications
        enabled —{" "}
        <span className="font-semibold text-foreground">
          {recipientCount} {recipientCount === 1 ? "person" : "people"}
        </span>{" "}
        right now.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <div>
          <label className="text-xs font-semibold text-foreground/60">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Hey, we miss you!"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground/60">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={180}
            rows={3}
            placeholder="Forgot about us? New reviews are up."
            className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {result && (
        <p className="mt-3 text-sm font-semibold text-emerald-600">
          Sent to {result.sent} {result.sent === 1 ? "device" : "devices"}
          {result.failed > 0 ? ` (${result.failed} failed)` : ""}.
        </p>
      )}

      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:bg-primary-dark disabled:opacity-40"
      >
        {sending ? "Sending…" : "Send Notification"}
      </button>
    </div>
  );
}
