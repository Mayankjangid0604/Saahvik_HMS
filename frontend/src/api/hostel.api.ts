/** Hostel/rooms API backed by the real backend. */
import type {
  BulkAddRoomsInput,
  CreateRoomInput,
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
}

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
