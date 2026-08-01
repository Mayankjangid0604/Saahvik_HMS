/** Global + saved search API (features 10, 11). */
import type {
  CreateSavedSearchInput,
  GlobalSearchResults,
  SavedSearch,
} from "./types";
import { apiClient } from "./client";

/** Cross-entity search, grouped by entity. */
export async function globalSearch(
  term: string,
  opts: { entity?: string; limit?: number } = {},
): Promise<GlobalSearchResults> {
  const { data } = await apiClient.get<GlobalSearchResults>("/search", {
    params: { term, ...opts },
  });
  return data;
}

// ---------- Saved searches ----------

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const { data } = await apiClient.get<SavedSearch[]>("/search/saved");
  return data;
}

export async function createSavedSearch(input: CreateSavedSearchInput): Promise<SavedSearch> {
  const { data } = await apiClient.post<SavedSearch>("/search/saved", input);
  return data;
}

export async function deleteSavedSearch(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.delete<{ ok: boolean }>(`/search/saved/${id}`);
  return data;
}
