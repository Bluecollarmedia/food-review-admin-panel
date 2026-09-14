import AppealsList from "@/components/admin/AppealsList";

export const dynamic = "force-dynamic";

// FRONT-END ONLY for now. The real appeals live in the main site's Netlify Blobs
// (with selfie photos in R2) — see BACKEND_TODO.md. Until that's wired up, this
// renders the real Appeals UI with an empty list (the "No appeals yet" state).
// To connect later: fetch listAppeals() + map selfie URLs and pass them in.
export default async function AdminAppealsPage() {
  const rows: [] = [];

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
