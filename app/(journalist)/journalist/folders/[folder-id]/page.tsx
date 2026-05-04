type PageProps = {
  params: { 'folder-id': string };
};

export default function JournalistFolderDetailPage({ params }: PageProps) {
  const { 'folder-id': folderId } = params;
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-xl font-semibold">Folder</h1>
      <p className="text-neutral-600 mt-2">ID: {folderId} — Batch 4</p>
    </main>
  );
}
