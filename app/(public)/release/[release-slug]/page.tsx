type PageProps = {
  params: { 'release-slug': string };
};

export default function ReleasePage({ params }: PageProps) {
  const { 'release-slug': releaseSlug } = params;
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-xl font-semibold">Release</h1>
      <p className="text-neutral-600 mt-2">/{releaseSlug} — Batch 3</p>
    </main>
  );
}
