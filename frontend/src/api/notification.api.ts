/** Mock notifications API. */
import type { AppNotification, ListParams, Paginated } from "./types";
import { delay, notifications, paginate } from "./mock/db";

export interface NotificationListParams extends ListParams {
  onlyUnread?: boolean;
}

export async function listNotifications(
  params: NotificationListParams = {},
): Promise<Paginated<AppNotification>> {
  await delay();
  let list = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (params.onlyUnread) list = list.filter((n) => !n.read);
  return paginate(list, params.page, params.pageSize ?? 20);
}

export async function getUnreadCount(): Promise<number> {
  await delay(150);
  return notifications.filter((n) => !n.read).length;
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  await delay(200);
  const n = notifications.find((x) => x.id === id);
  if (n) n.read = true;
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  await delay(300);
  notifications.forEach((n) => {
    n.read = true;
  });
  return { ok: true };
}
