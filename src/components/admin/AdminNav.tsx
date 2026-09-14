"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNav({
  unreadNotifications = 0,
  newAppeals = 0,
  pendingAccounts = 0,
  unlocked = true,
}: {
  unreadNotifications?: number;
  newAppeals?: number;
  pendingAccounts?: number;
  unlocked?: boolean;
}) {
  const pathname = usePathname();

  if (pathname === "/admin/login" || pathname === "/admin/unlock") return null;

  // Reviews (and uploading) is reachable with just the shared admin code. Every
  // other tab needs the separate security passcode, so hide them until it's
  // entered.
  const restrictedLinks = [
    { href: "/admin/settings", label: "Settings" },
    { href: "/admin/visitors", label: "Visitors" },
    { href: "/admin/appeals", label: `Appeals${newAppeals ? ` (${newAppeals})` : ""}` },
    { href: "/admin/users", label: `Accounts${pendingAccounts ? ` (${pendingAccounts})` : ""}` },
    { href: "/admin/comments", label: "Comments" },
    {
      href: "/admin/notifications",
      label: `Notifications${unreadNotifications ? ` (${unreadNotifications})` : ""}`,
    },
    { href: "/admin/storage", label: "Storage" },
  ];

  const links = [
    { href: "/admin", label: "Reviews" },
    ...(unlocked ? restrictedLinks : []),
  ];

  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
        <span className="font-display text-lg tracking-wide text-foreground">
          D&amp;S Admin
        </span>
        {!unlocked && (
          <Link
            href="/admin/unlock"
            className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-foreground/50 hover:text-primary"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Unlock more
          </Link>
        )}
      </div>
      <nav className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-5">
        {links.map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
