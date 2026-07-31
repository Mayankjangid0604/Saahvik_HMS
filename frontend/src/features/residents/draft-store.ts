const DRAFTS_KEY = "saahvik.resident-drafts";

export interface ResidentDraft {
  id: string;
  name: string;
  savedAt: string;
  data: Record<string, string>;
}

function readDrafts(): ResidentDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? (JSON.parse(raw) as ResidentDraft[]) : [];
  } catch {
    return [];
  }
}

function writeDrafts(drafts: ResidentDraft[]): void {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function getDrafts(): ResidentDraft[] {
  return readDrafts().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveDraft(data: Record<string, string>, existingId?: string): string {
  const drafts = readDrafts();
  const id = existingId ?? crypto.randomUUID();
  const name = data.candidateName?.trim() || "Untitled draft";
  const idx = drafts.findIndex((d) => d.id === id);
  const entry: ResidentDraft = { id, name, savedAt: new Date().toISOString(), data };
  if (idx >= 0) {
    drafts[idx] = entry;
  } else {
    drafts.push(entry);
  }
  writeDrafts(drafts);
  return id;
}

export function deleteDraft(id: string): void {
  writeDrafts(readDrafts().filter((d) => d.id !== id));
}

export function getDraft(id: string): ResidentDraft | undefined {
  return readDrafts().find((d) => d.id === id);
}

export function clearLegacyDraft(): void {
  localStorage.removeItem("saahvik.draft.add-resident");
}
