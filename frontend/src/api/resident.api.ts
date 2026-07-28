/** Mock residents API. Swap internals for apiClient calls later. */
import type {
  BulkImportResult,
  BulkImportRow,
  CreateResidentInput,
  Paginated,
  Resident,
  ResidentListParams,
} from "./types";
import { delay, nextId, paginate, residents, rooms, sortBy } from "./mock/db";

export async function listResidents(params: ResidentListParams = {}): Promise<Paginated<Resident>> {
  await delay();
  let list = residents.filter((r) => r.status !== "alumni");
  if (params.status && params.status !== "all") {
    list = residents.filter((r) => r.status === params.status);
  }
  if (params.roomId) list = list.filter((r) => r.roomId === params.roomId);
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.roomNumber?.toLowerCase().includes(q),
    );
  }
  list = sortBy(list, params.sortBy ?? "name", params.sortDir ?? "asc");
  return paginate(list, params.page, params.pageSize);
}

export async function listAlumni(params: ResidentListParams = {}): Promise<Paginated<Resident>> {
  return listResidents({ ...params, status: "alumni" });
}

/** Unpaginated actives, for pickers. */
export async function listAllActiveResidents(): Promise<Resident[]> {
  await delay(200);
  return residents.filter((r) => r.status === "active");
}

export async function getResident(id: string): Promise<Resident> {
  await delay(300);
  const r = residents.find((x) => x.id === id);
  if (!r) throw new Error("Resident not found");
  return { ...r };
}

export async function createResident(input: CreateResidentInput): Promise<Resident> {
  await delay(600);
  const room = rooms.find((r) => r.id === input.roomId);
  const bed = room?.beds.find((b) => b.id === input.bedId);
  if (input.roomId && (!room || !bed)) throw new Error("Selected bed not found");
  if (bed && bed.status === "occupied") throw new Error(`Bed ${bed.label} is already occupied`);

  const resident: Resident = {
    ...input,
    id: nextId("res"),
    status: input.status ?? "active",
    roomNumber: room?.number,
    bedLabel: bed?.label,
    // Fixed-fee rooms lock the fee to the room amount regardless of the form value
    monthlyFeePaisa:
      room?.feeMode === "fixed" && room.fixedFeeAmountPaisa != null
        ? room.fixedFeeAmountPaisa
        : input.monthlyFeePaisa,
    duesPaisa: 0,
  };
  residents.push(resident);
  if (bed && room) {
    bed.status = "occupied";
    bed.residentId = resident.id;
    bed.residentName = resident.name;
    room.occupiedCount++;
  }
  return resident;
}

export async function updateResident(id: string, input: Partial<Resident>): Promise<Resident> {
  await delay(500);
  const r = residents.find((x) => x.id === id);
  if (!r) throw new Error("Resident not found");
  Object.assign(r, input);
  return { ...r };
}

/** Move a resident out: frees the bed, marks alumni. */
export async function checkoutResident(id: string, exitDate: string): Promise<Resident> {
  await delay(600);
  const r = residents.find((x) => x.id === id);
  if (!r) throw new Error("Resident not found");
  const room = rooms.find((x) => x.id === r.roomId);
  const bed = room?.beds.find((b) => b.id === r.bedId);
  if (bed && room) {
    bed.status = "vacant";
    bed.residentId = undefined;
    bed.residentName = undefined;
    room.occupiedCount--;
  }
  r.status = "alumni";
  r.exitDate = exitDate;
  r.roomId = undefined;
  r.roomNumber = undefined;
  r.bedId = undefined;
  r.bedLabel = undefined;
  return { ...r };
}

export async function importResidents(mappedRows: BulkImportRow[]): Promise<BulkImportResult> {
  await delay(900);
  const errors: BulkImportResult["errors"] = [];
  let imported = 0;
  let skipped = 0;
  mappedRows.forEach((row, i) => {
    if (!row.name || !row.phone) {
      errors.push({ row: i + 1, message: "Name and phone are required" });
      return;
    }
    if (residents.some((r) => r.phone === row.phone)) {
      skipped++;
      return;
    }
    const room = rooms.find((r) => r.number.toLowerCase() === row.roomNumber.toLowerCase());
    const bed = room?.beds.find((b) => b.label === row.bedLabel && b.status === "vacant");
    if (row.roomNumber && !room) {
      errors.push({ row: i + 1, message: `Room "${row.roomNumber}" not found` });
      return;
    }
    if (room && !bed) {
      errors.push({ row: i + 1, message: `Bed ${row.bedLabel} in ${row.roomNumber} is not vacant` });
      return;
    }
    const resident: Resident = {
      id: nextId("res"),
      name: row.name,
      phone: row.phone,
      status: "active",
      roomId: room?.id,
      roomNumber: room?.number,
      bedId: bed?.id,
      bedLabel: bed?.label,
      joinDate: row.joinDate || new Date().toISOString(),
      guardianName: "",
      guardianPhone: "",
      permanentAddress: "",
      idType: "aadhaar",
      idNumber: "",
      occupation: "student",
      monthlyFeePaisa: Math.round(row.monthlyFeeRupees * 100),
      depositPaisa: 0,
      duesPaisa: 0,
    };
    residents.push(resident);
    if (bed && room) {
      bed.status = "occupied";
      bed.residentId = resident.id;
      bed.residentName = resident.name;
      room.occupiedCount++;
    }
    imported++;
  });
  return { imported, skipped, errors };
}
