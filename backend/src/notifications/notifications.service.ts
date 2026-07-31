import { Inject, Injectable } from "@nestjs/common";
import type { NotificationKind } from "@prisma/client";
import { Subject } from "rxjs";
import type { AuthUser } from "../common/auth-user";
import { PrismaService } from "../prisma/prisma.service";

interface NotifyEvent {
  kind: NotificationKind;
  /** Which preference toggle gates this event; undefined → only channelInApp gates it. */
  prefKey?: "duesReminder" | "paymentReceived" | "newComplaint" | "complaintResolved";
  title: string;
  body: string;
  link?: string;
  /** Skip this user (usually the actor — no self-notifications). */
  excludeUserId?: string;
}

export interface SsePayload {
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  private readonly sseStreams = new Map<string, Subject<SsePayload>>();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Get or create a per-user SSE subject keyed by `role:userId`. */
  getStream(user: AuthUser): Subject<SsePayload> {
    const key = `${user.role}:${user.userId}`;
    let subj = this.sseStreams.get(key);
    if (!subj) {
      subj = new Subject<SsePayload>();
      this.sseStreams.set(key, subj);
    }
    return subj;
  }

  removeStream(user: AuthUser): void {
    const key = `${user.role}:${user.userId}`;
    const subj = this.sseStreams.get(key);
    if (subj) {
      subj.complete();
      this.sseStreams.delete(key);
    }
  }

  /**
   * Fan a notification out to every login of the org (owners + active staff),
   * honoring each recipient's in-app preference toggles.
   */
  async notifyOrg(orgId: string, event: NotifyEvent): Promise<void> {
    const [owners, staff, prefs] = await this.prisma.$transaction([
      this.prisma.owner.findMany({ where: { orgId }, select: { id: true } }),
      this.prisma.staff.findMany({
        where: { orgId, status: "active" },
        select: { id: true },
      }),
      this.prisma.notificationPreference.findMany({ where: { orgId } }),
    ]);

    const recipients = [
      ...owners.map((o) => ({ userId: o.id, userType: "owner" as const })),
      ...staff.map((s) => ({ userId: s.id, userType: "staff" as const })),
    ].filter((r) => r.userId !== event.excludeUserId);

    const rows = recipients.filter((r) => {
      const pref = prefs.find((p) => p.userId === r.userId && p.userType === r.userType);
      // No preference row yet → defaults (all in-app toggles on except none).
      if (!pref) return true;
      if (!pref.channelInApp) return false;
      return event.prefKey ? pref[event.prefKey] : true;
    });

    if (rows.length === 0) return;
    await this.prisma.notification.createMany({
      data: rows.map((r) => ({
        orgId,
        userId: r.userId,
        userType: r.userType,
        kind: event.kind,
        title: event.title,
        body: event.body,
        link: event.link,
      })),
    });

    // Push to any connected SSE clients
    for (const r of rows) {
      const key = `${r.userType}:${r.userId}`;
      const subj = this.sseStreams.get(key);
      if (subj) {
        subj.next({ title: event.title, body: event.body, link: event.link });
      }
    }
  }

  async list(user: AuthUser, params: { page?: number; pageSize?: number; onlyUnread?: boolean }) {
    const where = {
      orgId: user.orgId,
      userId: user.userId,
      userType: user.role,
      ...(params.onlyUnread ? { read: false } : {}),
    };
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      data: rows.map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
        link: n.link ?? undefined,
      })),
      total,
      page,
      pageSize,
    };
  }

  async unreadCount(user: AuthUser): Promise<number> {
    return this.prisma.notification.count({
      where: { orgId: user.orgId, userId: user.userId, userType: user.role, read: false },
    });
  }

  async markRead(user: AuthUser, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, orgId: user.orgId, userId: user.userId, userType: user.role },
      data: { read: true },
    });
    return { ok: true };
  }

  async markAllRead(user: AuthUser) {
    await this.prisma.notification.updateMany({
      where: { orgId: user.orgId, userId: user.userId, userType: user.role, read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
