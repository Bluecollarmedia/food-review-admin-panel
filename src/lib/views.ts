import { sharedStore } from "./blob-store";

function viewsStore() {
  return sharedStore("views");
}

export async function getViews(slug: string): Promise<number> {
  const stored = (await viewsStore().get(slug, { type: "json" })) as number | null;
  return stored ?? 0;
}

export async function incrementViews(slug: string): Promise<number> {
  const current = await getViews(slug);
  const updated = current + 1;
  await viewsStore().setJSON(slug, updated);
  return updated;
}

export async function getAllViews(slugs: string[]): Promise<Record<string, number>> {
  const store = viewsStore();
  const entries = await Promise.all(
    slugs.map(async (slug) => [slug, (await store.get(slug, { type: "json" })) ?? 0] as const)
  );
  return Object.fromEntries(entries);
}
