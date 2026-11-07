import { useCallback, useSyncExternalStore } from 'react';
import type { JobSummary } from '@/types/job.types';

const STORAGE_KEY = 'candidate-portal:bookmarks';
const EMPTY: JobSummary[] = [];

function readBookmarks(): JobSummary[] {
  if (typeof window === 'undefined') return EMPTY;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JobSummary[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

let bookmarks = readBookmarks();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): JobSummary[] {
  return bookmarks;
}

function setBookmarks(next: JobSummary[]) {
  bookmarks = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (private mode); keep the in-memory state.
  }
  listeners.forEach((listener) => listener());
}

/**
 * UI-only bookmarks until the bookmarks module exists. The store is shared by
 * every component and persisted to local storage.
 */
export function useLocalBookmarks() {
  const items = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const isBookmarked = useCallback(
    (id: string) => items.some((job) => job.id === id),
    [items],
  );

  const toggleBookmark = useCallback((job: JobSummary) => {
    const exists = bookmarks.some((item) => item.id === job.id);
    setBookmarks(
      exists
        ? bookmarks.filter((item) => item.id !== job.id)
        : [...bookmarks, job],
    );
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(bookmarks.filter((item) => item.id !== id));
  }, []);

  return {
    bookmarks: items,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
  };
}
