import { useState } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

/** Server-side pagination state: 1-based page + pageSize, sent as query params. */
export function usePagination(initialPageSize = 10): PaginationState {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);

  const setPageSize = (size: number) => {
    setPageSizeRaw(size);
    setPage(1);
  };

  return { page, pageSize, setPage, setPageSize, reset: () => setPage(1) };
}
