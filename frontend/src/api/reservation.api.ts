/** Reservations API (feature 5): pre-booking holds that convert into residents. */
import type {
  CreateReservationInput,
  Paginated,
  Reservation,
  ReservationListParams,
} from "./types";
import { apiClient } from "./client";

export async function listReservations(
  params: ReservationListParams = {},
): Promise<Paginated<Reservation>> {
  const { data } = await apiClient.get<Paginated<Reservation>>("/reservations", { params });
  return data;
}

export async function getReservation(id: string): Promise<Reservation> {
  const { data } = await apiClient.get<Reservation>(`/reservations/${id}`);
  return data;
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const { data } = await apiClient.post<Reservation>("/reservations", input);
  return data;
}

export async function updateReservation(
  id: string,
  input: Partial<CreateReservationInput>,
): Promise<Reservation> {
  const { data } = await apiClient.put<Reservation>(`/reservations/${id}`, input);
  return data;
}

export async function cancelReservation(id: string): Promise<Reservation> {
  const { data } = await apiClient.post<Reservation>(`/reservations/${id}/cancel`);
  return data;
}

/** Turn a held/confirmed reservation into a real resident on the given bed. */
export async function convertReservation(
  id: string,
  body: { bedId: string; joinDate: string },
): Promise<Reservation> {
  const { data } = await apiClient.post<Reservation>(`/reservations/${id}/convert`, body);
  return data;
}
