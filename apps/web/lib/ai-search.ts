'use client';

import { rememberSearchTaste } from './taste-memory';

export const pendingAiSearchKey = '3s-design-pending-ai-search';
export const aiSearchEvent = '3s-design-ai-search';

export function queueAiSearch(prompt: string) {
  const text = prompt.trim();
  if (!text) {
    return;
  }

  window.localStorage.setItem(pendingAiSearchKey, text);
  rememberSearchTaste(text);
  window.dispatchEvent(new CustomEvent(aiSearchEvent, { detail: text }));
}

export function consumeQueuedAiSearch() {
  const text = window.localStorage.getItem(pendingAiSearchKey);
  if (text) {
    window.localStorage.removeItem(pendingAiSearchKey);
  }
  return text;
}
