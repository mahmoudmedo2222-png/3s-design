'use client';

export const savedSearchesKey = '3s-design-saved-searches';
export const savedSearchesChangedEvent = '3s-design-saved-searches-changed';

export type SavedSearch = {
  id: string;
  prompt: string;
  source: 'openai' | 'rules';
  resultCount: number;
  topResult?: string;
  savedAt: string;
};

export function readSavedSearches() {
  try {
    const raw = window.localStorage.getItem(savedSearchesKey);
    return raw ? (JSON.parse(raw) as SavedSearch[]) : [];
  } catch {
    return [];
  }
}

export function saveSearch(input: Omit<SavedSearch, 'id' | 'savedAt'>) {
  const saved: SavedSearch = {
    ...input,
    id: `search-${Date.now()}`,
    savedAt: new Date().toISOString(),
  };
  const next = [saved, ...readSavedSearches().filter((item) => item.prompt !== input.prompt)].slice(0, 30);

  window.localStorage.setItem(savedSearchesKey, JSON.stringify(next));
  window.dispatchEvent(new Event(savedSearchesChangedEvent));

  return saved;
}
