import { Controller, Get, Inject, Param, Put, Query, Req, Sse, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";
import type { Request } from "express";
import { Observable, merge, map, finalize, interval, startWith } from "rxjs";
import type { AuthUser, JwtPayload } from "../common/auth-user";
import { CurrentUser, Public } from "../common/decorators";
import { ValidatedQuery } from "../common/validated";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

class NotificationListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyUnread?: boolean;
}

/** Every route here operates on the CURRENT user's notifications only. */
@Controller("notifications")
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @ValidatedQuery(NotificationListDto) params: NotificationListDto) {
    return this.notifications.list(user, params);
  }

  @Get("unread-count")
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notifications.unreadCount(user);
  }

  @Put("mark-all-read")
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user);
  }

  @Put(":id/read")
  markRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.notifications.markRead(user, id);
  }

  /**
   * SSE stream. EventSource can't send Authorization headers,
   * so the token is passed as ?token=<jwt>.
   */
  @Public()
  @Sse("stream")
  async stream(@Query("token") token: string, @Req() req: Request): Promise<Observable<MessageEvent>> {
    if (!token) throw new UnauthorizedException("Missing token");

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    if (payload.role === "owner") {
      const owner = await this.prisma.owner.findUnique({
        where: { id: payload.sub },
        select: { tokenVersion: true },
      });
      if (!owner || owner.tokenVersion !== (payload.tv ?? 0)) {
        throw new UnauthorizedException("Token has been revoked");
      }
    }

    const user: AuthUser = {
      userId: payload.sub,
      orgId: payload.orgId,
      role: payload.role,
      staffRole: payload.staffRole,
      name: payload.name,
    };

    const stream = this.notifications.getStream(user);

    const heartbeat$ = interval(30_000).pipe(
      startWith(0),
      map(() => ({ data: JSON.stringify({ type: "heartbeat" }) }) as MessageEvent),
    );

    const events$ = stream.pipe(
      map((p) => ({ data: JSON.stringify({ type: "notification", ...p }) }) as MessageEvent),
    );

    return merge(heartbeat$, events$).pipe(
      finalize(() => this.notifications.removeStream(user)),
    );
  }
}
