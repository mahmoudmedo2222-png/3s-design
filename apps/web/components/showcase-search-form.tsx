'use client';

import { Search } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { queueAiSearch } from '../lib/ai-search';
import type { AppLocale } from '../lib/locale';
import { Button } from './ui';

export function ShowcaseSearchForm({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();

    if (!text) {
      return;
    }

    queueAiSearch(text);
    setQuery('');
    router.push(`/search?q=${encodeURIComponent(text)}` as Route);
  }

  return (
    <form
      onSubmit={submitSearch}
      className="hidden h-10 min-w-[220px] max-w-md flex-1 items-center gap-2 rounded-full border border-white/10 bg-cream px-4 text-sm text-cream-ink md:flex"
    >
      <Search size={16} />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-cream-ink outline-none placeholder:text-cream-ink/60"
        placeholder={locale === 'ar' ? 'ابحث بالإحساس أو المجال أو الستايل...' : 'Search by feeling, industry, style...'}
      />
      <Button
        type="submit"
        intent="secondary"
        size="sm"
        className="h-7 rounded-full border-transparent bg-cream-ink px-3 py-1 text-xs font-black text-cream hover:bg-pine hover:text-white"
      >
        {locale === 'ar' ? 'ابحث' : 'Find'}
      </Button>
    </form>
  );
}
