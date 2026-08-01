import { Inject, Injectable } from "@nestjs/common";
import { Prisma, SearchEntity } from "@prisma/client";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateSavedSearchDto, GlobalSearchDto } from "./dto";

/** Compact hit shape returned per match, grouped by entity. */
interface SearchHit {
  entity: "residents" | "rooms" | "staff" | "complaints";
  id: string;
  title: string;
  subtitle?: string;
  link: string;
}

interface GlobalSearchResult {
  residents: SearchHit[];
  rooms: SearchHit[];
  staff: SearchHit[];
  complaints: SearchHit[];
}

/** Default number of hits returned per entity group. */
const DEFAULT_GROUP_CAP = 8;

@Injectable()
export class SearchService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Feature 10 — global cross-entity search, always scoped to user.orgId (the
   * tenant boundary) and further gated by the caller's role so results never
   * leak data the caller couldn't otherwise see.
   */
  async globalSearch(user: AuthUser, dto: GlobalSearchDto): Promise<GlobalSearchResult> {
    const term = dto.term.trim();
    const cap = dto.limit ?? DEFAULT_GROUP_CAP;
    const entity = dto.entity && dto.entity !== "all" ? dto.entity : "all";

    // The staff directory is owner-only in this app: staff.controller.ts is
    // `@Controller("staff") @Roles("owner")`. Mirror that gate here — non-owners
    // must NOT receive `staff` hits, since a search must not surface data a role
    // can't reach through its normal list views.
    const canSeeStaff = user.role === "owner";

    const result: GlobalSearchResult = { residents: [], rooms: [], staff: [], complaints: [] };
    if (!term) return result;

    const want = (e: string) => entity === "all" || entity === e;

    if (want("residents")) result.residents = await this.searchResidents(user.orgId, term, cap);
    if (want("rooms")) result.rooms = await this.searchRooms(user.orgId, term, cap);
    if (want("complaints")) result.complaints = await this.searchComplaints(user.orgId, term, cap);
    // Role gate: only owners may search the staff directory.
    if (want("staff") && canSeeStaff) result.staff = await this.searchStaff(user.orgId, term, cap);

    return result;
  }

  private async searchResidents(orgId: string, term: string, cap: number): Promise<SearchHit[]> {
    const rows = await this.prisma.resident.findMany({
      where: {
        orgId,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { phone: { contains: term } },
          { room: { is: { number: { contains: term, mode: "insensitive" } } } },
        ],
      },
      select: { id: true, name: true, phone: true, room: { select: { number: true } } },
      orderBy: { name: "asc" },
      take: cap,
    });
    return rows.map((r) => ({
      entity: "residents" as const,
      id: r.id,
      title: r.name,
      subtitle: r.room?.number ? `${r.phone} · ${r.room.number}` : r.phone,
      link: `/residents/${r.id}`,
    }));
  }

  private async searchRooms(orgId: string, term: string, cap: number): Promise<SearchHit[]> {
    const rows = await this.prisma.room.findMany({
      where: { orgId, number: { contains: term, mode: "insensitive" } },
      select: { id: true, number: true, floor: true },
      orderBy: { number: "asc" },
      take: cap,
    });
    return rows.map((r) => ({
      entity: "rooms" as const,
      id: r.id,
      title: r.number,
      subtitle: `Floor ${r.floor}`,
      link: `/rooms`,
    }));
  }

  private async searchStaff(orgId: string, term: string, cap: number): Promise<SearchHit[]> {
    const rows = await this.prisma.staff.findMany({
      where: {
        orgId,
        status: "active",
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: cap,
    });
    return rows.map((s) => ({
      entity: "staff" as const,
      id: s.id,
      title: s.name,
      subtitle: s.email,
      link: `/staff`,
    }));
  }

  private async searchComplaints(orgId: string, term: string, cap: number): Promise<SearchHit[]> {
    const rows = await this.prisma.complaint.findMany({
      where: {
        orgId,
        OR: [
          { ticketNo: { contains: term, mode: "insensitive" } },
          { title: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { id: true, ticketNo: true, title: true },
      orderBy: { createdAt: "desc" },
      take: cap,
    });
    return rows.map((c) => ({
      entity: "complaints" as const,
      id: c.id,
      title: c.ticketNo,
      subtitle: c.title,
      link: `/complaints/${c.id}`,
    }));
  }

  // ---------- Feature 11 — saved searches (per-user, not org-shared) ----------

  /** Only ever the current user's own saved searches. */
  private scope(user: AuthUser): Prisma.SavedSearchWhereInput {
    return { orgId: user.orgId, userId: user.userId, userType: user.role };
  }

  async listSaved(user: AuthUser) {
    const rows = await this.prisma.savedSearch.findMany({
      where: this.scope(user),
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toSavedSearchDto);
  }

  async createSaved(user: AuthUser, dto: CreateSavedSearchDto) {
    const saved = await this.prisma.savedSearch.create({
      data: {
        orgId: user.orgId,
        userId: user.userId,
        userType: user.role,
        name: dto.name,
        entity: dto.entity,
        query: dto.query as Prisma.InputJsonValue,
      },
    });
    return toSavedSearchDto(saved);
  }

  async deleteSaved(user: AuthUser, id: string) {
    // Scope by the owning user so a user can only delete their OWN saved
    // searches — anything else returns 404, never someone else's row.
    const existing = await this.prisma.savedSearch.findFirst({
      where: { id, ...this.scope(user) },
    });
    if (!existing) throw ApiError.notFound("Saved search");
    await this.prisma.savedSearch.delete({ where: { id: existing.id } });
    return { ok: true };
  }
}

function toSavedSearchDto(s: {
  id: string;
  name: string;
  entity: SearchEntity;
  query: Prisma.JsonValue;
  createdAt: Date;
}) {
  return {
    id: s.id,
    name: s.name,
    entity: s.entity,
    query: s.query,
    createdAt: s.createdAt.toISOString(),
  };
}
