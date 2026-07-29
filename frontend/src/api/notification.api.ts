/** Notifications API backed by the real backend. */
import type { AppNotification, ListParams, Paginated } from "./types";
import { apiClient } from "./client";

export interface NotificationListParams extends ListParams {
  onlyUnread?: boolean;
}

export async function listNotifications(
  params: NotificationListParams = {},
): Promise<Paginated<AppNotification>> {
  const { data } = await apiClient.get<Paginated<AppNotification>>("/notifications", {
    params: {
      page: params.page,
      pageSize: params.pageSize ?? 20,
      onlyUnread: params.onlyUnread || undefined,
    },
  });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<number>("/notifications/unread-count");
  return data;
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.put<{ ok: boolean }>(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const { data } = await apiClient.put<{ ok: boolean }>("/notifications/mark-all-read");
  return data;
}
