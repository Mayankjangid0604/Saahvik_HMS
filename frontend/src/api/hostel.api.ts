/** Mock hostel/rooms API. Swap internals for apiClient calls later. */
import type {
  BulkAddRoomsInput,
  CreateRoomInput,
  ListParams,
  Org,
  Paginated,
  Room,
  RoomTransferInput,
} from "./types";
import { delay, nextId, org, paginate, rooms, residents, sortBy } from "./mock/db";

export interface RoomListParams extends ListParams {
  floor?: number;
  type?: Room["type"] | "all";
}

export async function getHostel(): Promise<Org> {
  await delay(250);
  return { ...org };
}

export async function updateHostel(input: Partial<Org>): Promise<Org> {
  await delay(450);
  Object.assign(org, input);
  return { ...org };
}

export async function listRooms(params: RoomListParams = {}): Promise<Paginated<Room>> {
  await delay();
  let list = [...rooms];
  if (params.search) {
    const q = params.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.beds.some((b) => b.residentName?.toLowerCase().includes(q)),
    );
  }
  if (params.floor != null) list = list.filter((r) => r.floor === params.floor);
  if (params.type && params.type !== "all") list = list.filter((r) => r.type === params.type);
  list = sortBy(list, params.sortBy ?? "number", params.sortDir ?? "asc");
  return paginate(list, params.page, params.pageSize ?? 20);
}

/** Unpaginated, for pickers. */
export async function listAllRooms(): Promise<Room[]> {
  await delay(200);
  return [...rooms];
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  await delay(500);
  if (rooms.some((r) => r.number.toLowerCase() === input.number.toLowerCase())) {
    throw new Error(`${input.number} already exists`);
  }
  const id = nextId("room");
  const room: Room = {
    id,
    number: input.number,
    floor: input.floor,
    type: input.type,
    capacity: input.capacity,
    monthlyRentPaisa: input.monthlyRentPaisa,
    occupiedCount: 0,
    notes: input.notes,
    beds: Array.from({ length: input.capacity }, (_, i) => ({
      id: `${id}_${String.fromCharCode(65 + i)}`,
      roomId: id,
      label: String.fromCharCode(65 + i),
      status: "vacant" as const,
    })),
  };
  rooms.push(room);
  return room;
}

export async function bulkAddRooms(input: BulkAddRoomsInput): Promise<{ created: number }> {
  await delay(700);
  let created = 0;
  for (let i = 0; i < input.count; i++) {
    const num = `Room ${input.startNumber + i}`;
    if (rooms.some((r) => r.number === num)) continue;
    const id = nextId("room");
    rooms.push({
      id,
      number: num,
      floor: input.floor,
      type: input.type,
      capacity: input.capacity,
      monthlyRentPaisa: input.monthlyRentPaisa,
      occupiedCount: 0,
      beds: Array.from({ length: input.capacity }, (_, b) => ({
        id: `${id}_${String.fromCharCode(65 + b)}`,
        roomId: id,
        label: String.fromCharCode(65 + b),
        status: "vacant" as const,
      })),
    });
    created++;
  }
  return { created };
}

export async function transferResident(input: RoomTransferInput): Promise<{ ok: boolean }> {
  await delay(600);
  const resident = residents.find((r) => r.id === input.residentId);
  if (!resident) throw new Error("Resident not found");
  const toRoom = rooms.find((r) => r.id === input.toRoomId);
  const toBed = toRoom?.beds.find((b) => b.id === input.toBedId);
  if (!toRoom || !toBed) throw new Error("Target bed not found");
  if (toBed.status === "occupied") throw new Error(`Bed ${toBed.label} is already occupied`);

  // free old bed
  const fromRoom = rooms.find((r) => r.id === resident.roomId);
  const fromBed = fromRoom?.beds.find((b) => b.id === resident.bedId);
  if (fromBed) {
    fromBed.status = "vacant";
    fromBed.residentId = undefined;
    fromBed.residentName = undefined;
    if (fromRoom) fromRoom.occupiedCount--;
  }

  toBed.status = "occupied";
  toBed.residentId = resident.id;
  toBed.residentName = resident.name;
  toRoom.occupiedCount++;
  resident.roomId = toRoom.id;
  resident.roomNumber = toRoom.number;
  resident.bedId = toBed.id;
  resident.bedLabel = toBed.label;
  resident.monthlyFeePaisa = toRoom.monthlyRentPaisa;
  return { ok: true };
}
