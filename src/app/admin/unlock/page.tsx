import Link from "next/link";
import { redirect } from "next/navigation";
import { isSettingsUnlocked } from "@/lib/settings-guard";
import { getSettingsPasscode } from "@/lib/locked-passcode";
import AdminUnlockForm from "@/components/admin/AdminUnlockForm";

export const dynamic = "force-dynamic";

// Only allow redirecting back to an internal admin page.
function safeRedirect(target: string | undefined): string {
  if (target && target.startsWith("/admin") && !target.startsWith("//")) return target;
  return "/admin";
}

export default async function AdminUnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const target = safeRedirect(redirectParam);

  // Nothing to unlock (no security passcode set) or already unlocked → go on.
  const passcode = await getSettingsPasscode();
  if (!passcode || (await isSettingsUnlocked())) {
    redirect(target);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-5 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5 text-foreground/60">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <h1 className="mt-4 font-display text-2xl tracking-wide text-foreground">
        Enter the security passcode
      </h1>
      <p className="mt-2 text-sm text-foreground/60">
        The shared admin login covers Reviews and uploading. Everything else —
        Visitors, Comments, Accounts, Notifications, Storage and Settings — needs
        the separate security passcode.
      </p>
      <div className="mt-6">
        <AdminUnlockForm redirectTo={target} />
      </div>
      <Link href="/admin" className="mt-6 text-sm font-medium text-primary hover:underline">
        &larr; Back to Reviews
      </Link>
    </div>
  );
}
