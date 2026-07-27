/** Mock complaints API. */
import type {
  Complaint,
  ComplaintListParams,
  ComplaintStatus,
  CreateComplaintInput,
  Paginated,
} from "./types";
import { complaints, delay, nextId, nextTicketNo, paginate, residents, sortBy } from "./mock/db";

export async function listComplaints(params: ComplaintListParams = {}): Promise<Paginated<Complaint>> {
  await delay();
  let list = [...complaints];
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.ticketNo.toLowerCase().includes(q) ||
        c.residentName?.toLowerCase().includes(q),
    );
  }
  if (params.status && params.status !== "all") list = list.filter((c) => c.status === params.status);
  if (params.category && params.category !== "all")
    list = list.filter((c) => c.category === params.category);
  list = sortBy(list, params.sortBy ?? "createdAt", params.sortDir ?? "desc");
  return paginate(list, params.page, params.pageSize);
}

export async function getComplaint(id: string): Promise<Complaint> {
  await delay(300);
  const c = complaints.find((x) => x.id === id);
  if (!c) throw new Error("Complaint not found");
  return { ...c, timeline: [...c.timeline] };
}

export async function createComplaint(input: CreateComplaintInput): Promise<Complaint> {
  await delay(600);
  const r = input.residentId ? residents.find((x) => x.id === input.residentId) : undefined;
  const nowIso = new Date().toISOString();
  const complaint: Complaint = {
    id: nextId("cmp"),
    ticketNo: nextTicketNo(),
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    status: "open",
    residentId: r?.id,
    residentName: r?.name,
    roomNumber: r?.roomNumber,
    createdAt: nowIso,
    updatedAt: nowIso,
    timeline: [
      { id: nextId("ce"), status: "open", note: "Complaint registered", byName: "Mayank Jangid", at: nowIso },
    ],
    attachments: (input.attachments ?? []).map((a) => ({
      id: nextId("att"),
      fileName: a.fileName,
      fileType: a.fileType,
      url: "",
    })),
  };
  complaints.unshift(complaint);
  return complaint;
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  note?: string,
): Promise<Complaint> {
  await delay(500);
  const c = complaints.find((x) => x.id === id);
  if (!c) throw new Error("Complaint not found");
  const nowIso = new Date().toISOString();
  c.status = status;
  c.updatedAt = nowIso;
  c.timeline.push({ id: nextId("ce"), status, note, byName: "Mayank Jangid", at: nowIso });
  return { ...c, timeline: [...c.timeline] };
}
