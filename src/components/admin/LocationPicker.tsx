"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Props = {
  lat?: number;
  lng?: number;
  address?: string;
  onChange: (v: { lat?: number; lng?: number; address?: string }) => void;
};

type Suggestion = { label: string; lat?: number; lng?: number; placeId?: string };

// True when the text is a link or raw coordinates (paste path) rather than
// something to autocomplete.
function isLinkOrCoords(s: string) {
  return /^https?:\/\//i.test(s) || /^\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*$/.test(s);
}

export default function LocationPicker({ lat, lng, address, onChange }: Props) {
  const [query, setQuery] = useState(address ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<string | null>(null);

  // One Google session token per search-and-pick, for cheapest billing.
  function ensureSession() {
    if (!sessionRef.current) {
      sessionRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
    }
    return sessionRef.current;
  }

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const start: [number, number] =
      typeof lat === "number" && typeof lng === "number" ? [lat, lng] : [40.09, -74.22];
    const map = L.map(elRef.current, { zoomControl: true }).setView(
      start,
      typeof lat === "number" ? 16 : 10
    );
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const marker = L.marker(start, { draggable: true, opacity: typeof lat === "number" ? 1 : 0 });
    marker.addTo(map);
    markerRef.current = marker;
    marker.on("dragend", () => {
      const p = marker.getLatLng();
      onChange({ lat: p.lat, lng: p.lng, address: query || undefined });
      setStatus("Pin moved.");
    });
    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng).setOpacity(1);
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng, address: query || undefined });
      setStatus("Pin placed.");
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function place(nlat: number, nlng: number, label?: string) {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (map && marker) {
      marker.setLatLng([nlat, nlng]).setOpacity(1);
      map.setView([nlat, nlng], 16);
    }
    onChange({ lat: nlat, lng: nlng, address: label ?? query ?? undefined });
  }

  // Debounced live suggestions as the admin types a name/address.
  function onType(value: string) {
    setQuery(value);
    setStatus(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (isLinkOrCoords(value) || value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const token = ensureSession();
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/resolve-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suggest: true, query: value, sessionToken: token }),
        });
        const data = await res.json();
        setSuggestions(data.results ?? []);
        setOpen((data.results ?? []).length > 0);
        // Show Google's reason if it rejected the request, so problems are visible.
        if (data.error) setStatus(`Search error: ${data.error}`);
      } catch {
        setSuggestions([]);
      }
    }, 280);
  }

  async function pick(s: Suggestion) {
    setQuery(s.label);
    setSuggestions([]);
    setOpen(false);

    // Photon results carry coords directly; Google predictions need a Details
    // lookup (same session token, cheapest field set).
    if (typeof s.lat === "number" && typeof s.lng === "number") {
      place(s.lat, s.lng, s.label);
      setStatus(`Set: ${s.label}`);
    } else if (s.placeId) {
      setStatus("Getting location…");
      try {
        const res = await fetch("/api/admin/resolve-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId: s.placeId, sessionToken: sessionRef.current }),
        });
        const data = await res.json();
        if (typeof data.lat === "number") {
          place(data.lat, data.lng, s.label);
          setStatus(`Set: ${s.label}`);
        } else {
          setStatus(data.error ?? "Couldn't get that location.");
        }
      } catch {
        setStatus("Couldn't get that location.");
      }
    }
    sessionRef.current = null; // end the billing session after a pick
  }

  // For a pasted link / coordinates.
  async function resolveLink() {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setStatus("Reading link…");
    try {
      const res = await fetch("/api/admin/resolve-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok || typeof data.lat !== "number") {
        setStatus(data.error ?? "Couldn't read that link.");
        return;
      }
      place(data.lat, data.lng, data.label ?? q);
      setStatus("Location set from link.");
    } catch {
      setStatus("Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    markerRef.current?.setOpacity(0);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    setStatus(null);
    onChange({ lat: undefined, lng: undefined, address: undefined });
  }

  const hasPin = typeof lat === "number" && typeof lng === "number";
  const linkMode = isLinkOrCoords(query);

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => onType(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (linkMode) resolveLink();
                else if (suggestions[0]) pick(suggestions[0]);
              }
            }}
            placeholder="Type a store name or address, or paste a Google Maps link"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {linkMode && (
            <button
              type="button"
              onClick={resolveLink}
              disabled={busy}
              className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "…" : "Use link"}
            </button>
          )}
        </div>

        {open && suggestions.length > 0 && (
          <ul className="absolute z-[1000] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface shadow-lg">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => pick(s)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-primary">
                    <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="11" r="2.5" />
                  </svg>
                  <span className="min-w-0">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="h-56 w-full overflow-hidden rounded-xl border border-border">
        <div ref={elRef} className="h-full w-full" />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground/55">
          {hasPin
            ? `Pinned: ${lat!.toFixed(5)}, ${lng!.toFixed(5)} — drag the pin to fine-tune`
            : "No location set — type to search, or drag/tap the map."}
        </span>
        {hasPin && (
          <button type="button" onClick={clear} className="font-semibold text-primary hover:underline">
            Clear
          </button>
        )}
      </div>
      {status && <p className="text-xs text-foreground/50">{status}</p>}
    </div>
  );
}
