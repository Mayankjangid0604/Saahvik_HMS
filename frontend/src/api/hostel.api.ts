/** Hostel/rooms API backed by the real backend. */
import type {
  BulkAddRoomsInput,
  CreateRoomInput,
  FloorSummary,
  ListParams,
  Org,
  Paginated,
  Room,
  RoomTransferInput,
  UpdateRoomInput,
  UpdateRoomFeeInput,
} from "./types";
import { apiClient } from "./client";

export interface RoomListParams extends ListParams {
  floor?: number;
  type?: Room["type"] | "all";
  /** Filter by allocation availability (rooms extras). */
  availability?: "blocked" | "available";
}

/**
 * Amenities a room can advertise (mirrors the backend ROOM_AMENITIES set).
 * Used to render the amenity picker/badges.
 */
export const ROOM_AMENITIES = [
  "ac",
  "cooler",
  "attached_bathroom",
  "balcony",
  "geyser",
  "wifi",
  "study_table",
  "wardrobe",
  "fan",
  "window",
  "power_backup",
  "tv",
] as const;

export type RoomAmenity = (typeof ROOM_AMENITIES)[number];

export async function getHostel(): Promise<Org> {
  const { data } = await apiClient.get<Org>("/settings/org");
  return data;
}

export async function updateHostel(input: Partial<Org>): Promise<Org> {
  const { data } = await apiClient.put<Org>("/settings/org", input);
  return data;
}

export async function listRooms(params: RoomListParams = {}): Promise<Paginated<Room>> {
  const { data } = await apiClient.get<Paginated<Room>>("/rooms", { params });
  return data;
}

/** Unpaginated, for pickers. */
export async function listAllRooms(): Promise<Room[]> {
  const { data } = await apiClient.get<Room[]>("/rooms/all");
  return data;
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const { data } = await apiClient.post<Room>("/rooms", input);
  return data;
}

export async function bulkAddRooms(input: BulkAddRoomsInput): Promise<{ created: number }> {
  const { data } = await apiClient.post<{ created: number }>("/rooms/bulk", input);
  return data;
}

export async function transferResident(input: RoomTransferInput): Promise<{ ok: boolean }> {
  const { data } = await apiClient.post<{ ok: boolean }>("/rooms/transfer", input);
  return data;
}

export async function updateRoom(roomId: string, input: UpdateRoomInput): Promise<Room> {
  const { data } = await apiClient.put<Room>(`/rooms/${roomId}`, input);
  return data;
}

export async function updateRoomFee(roomId: string, input: UpdateRoomFeeInput): Promise<Room> {
  const { data } = await apiClient.put<Room>(`/rooms/${roomId}/fee-settings`, input);
  return data;
}

/** Per-floor occupancy rollup with each floor's rooms. */
export async function getRoomFloors(): Promise<FloorSummary[]> {
  const { data } = await apiClient.get<FloorSummary[]>("/rooms/floors");
  return data;
}

/** Take a room out of service (or restore it). */
export async function setRoomBlocked(
  roomId: string,
  body: { blocked: boolean; reason?: string },
): Promise<Room> {
  const { data } = await apiClient.put<Room>(`/rooms/${roomId}/block`, body);
  return data;
}
