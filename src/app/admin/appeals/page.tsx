import { listAppeals } from "@/lib/appeals";
import { getPublicFileUrl } from "@/lib/media-url";
import AppealsList from "@/components/admin/AppealsList";

export const dynamic = "force-dynamic";

export default async function AdminAppealsPage() {
  const appeals = await listAppeals();
  const rows = appeals.map((a) => ({ ...a, selfieUrl: getPublicFileUrl(a.selfieKey) }));

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10">
      <h1 className="font-display text-3xl tracking-wide text-foreground">
        Admin &middot; Appeals
      </h1>
      <p className="mt-2 text-sm text-foreground/60">
        People who were banned and think it&apos;s a mistake. Unban them in one tap, or
        generate a one-time code to send them so they can let themselves back in.
      </p>
      <AppealsList appeals={rows} />
    </div>
  );
}
