import { redirect } from 'next/navigation';

type PageProps = {
  searchParams: { q?: string };
};

export default function JournalistSearchPage({ searchParams }: PageProps) {
  const q = (searchParams.q ?? '').trim();
  redirect(q ? `/journalist/discover?q=${encodeURIComponent(q)}` : '/journalist/discover');
}
