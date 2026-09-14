import Link from "next/link";

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-16 text-center">
      <h1 className="font-display text-3xl tracking-wide text-foreground">{title}</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-foreground/60">
        This section is being moved into the standalone admin panel. It&apos;s coming next.
      </p>
      <Link
        href="/admin/settings"
        className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Go to Settings
      </Link>
    </div>
  );
}
