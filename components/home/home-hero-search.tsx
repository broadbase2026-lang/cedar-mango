'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TypingSearchPlaceholder } from '@/components/home/typing-search-placeholder';

const SEARCH_TERMS = [
  'luxury hotel openings in Singapore...',
  'new bars in Tokyo...',
  'upcoming art exhibitions in Hong Kong...',
];

export function HomeHeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const showPlaceholder = query.length === 0;

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed) {
          router.push(`/release?q=${encodeURIComponent(trimmed)}`);
        }
      }}
    >
      <div className="relative flex-1">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder=""
          aria-label="Search press releases"
          name="q"
        />
        {showPlaceholder ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-4 text-sm text-text-disabled">
            <TypingSearchPlaceholder terms={SEARCH_TERMS} />
          </div>
        ) : null}
      </div>
      <Button type="submit" className="sm:w-auto">
        Search
      </Button>
    </form>
  );
}
