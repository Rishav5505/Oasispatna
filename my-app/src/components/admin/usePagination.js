import { useState } from 'react';

export const PAGE_SIZE = 20;

// Client-side pagination. Page is clamped so shrinking lists (filters, deletes) never show an empty page.
export default function usePagination(items, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const list = items || [];
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  return {
    page: current,
    setPage,
    totalPages,
    total: list.length,
    start,
    pageSize,
    pageItems: list.slice(start, start + pageSize),
  };
}
