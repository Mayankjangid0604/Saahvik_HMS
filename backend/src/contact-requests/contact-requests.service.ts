import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateContactRequestDto } from "./dto";

@Injectable()
export class ContactRequestsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Stores a lead from the public landing form. No notification is sent —
   * EmailService is a logging stub and SES is not connected in this codebase,
   * so the DB row is the delivery mechanism. Owners read them via list().
   */
  async create(dto: CreateContactRequestDto) {
    const row = await this.prisma.contactRequest.create({
      data: {
        name: dto.name.trim(),
        hostelName: dto.hostelName.trim(),
        phone: dto.phone.trim(),
        beds: dto.beds,
      },
      select: { id: true, createdAt: true },
    });
    // Nothing about the stored lead is echoed back to an anonymous caller.
    return { id: row.id, createdAt: row.createdAt };
  }

  /** Newest first. Volume is low enough that pagination is not yet warranted. */
  list() {
    return this.prisma.contactRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
}
