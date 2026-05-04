type PageProps = {
  params: { 'brand-slug': string };
};

export default function NewsroomPage({ params }: PageProps) {
  const { 'brand-slug': brandSlug } = params;
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-xl font-semibold">Newsroom</h1>
      <p className="text-neutral-600 mt-2">/{brandSlug} — Batch 3</p>
    </main>
  );
}
