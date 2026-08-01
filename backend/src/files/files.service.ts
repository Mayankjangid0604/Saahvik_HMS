import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import { mkdir, stat, writeFile } from "fs/promises";
import { extname, join, normalize, resolve, sep } from "path";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { resolvePortalResidentIds } from "../common/portal-scope";
import { PrismaService } from "../prisma/prisma.service";

/**
 * FILE ACCESS RULE (frozen decision 4): uploads are NEVER served from a
 * static path. Keys are prefixed with the owning orgId and every read goes
 * through the authenticated GET /files/* endpoint, which refuses keys
 * outside the caller's org. There is no /uploads/ static route.
 */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

@Injectable()
export class FilesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private get uploadsRoot(): string {
    return resolve(process.env.UPLOADS_PATH ?? "./uploads");
  }

  /** Persist an uploaded file under the caller's org. Returns the storage key. */
  async store(user: AuthUser, file: Express.Multer.File): Promise<{ key: string; url: string }> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "UNSUPPORTED_FILE_TYPE",
        "Only JPEG, PNG and PDF files are allowed",
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        "FILE_TOO_LARGE",
        "Files must be 5 MB or smaller",
      );
    }

    const ext = EXT_BY_MIME[file.mimetype] ?? extname(file.originalname);
    const key = `${user.orgId}/${randomUUID()}${ext}`;
    const target = join(this.uploadsRoot, key);
    await mkdir(join(this.uploadsRoot, user.orgId), { recursive: true });
    await writeFile(target, file.buffer);
    return { key, url: fileUrl(key) };
  }

  /**
   * Persist a server-generated buffer under an org (feature 16 — the report
   * scheduler stores generated PDFs/XLSX outside any HTTP request, so there is
   * no Multer file or AuthUser). Returns the storage key, prefixed with the org
   * like every other upload so the authenticated /files endpoint can serve it.
   */
  async storeBuffer(orgId: string, buffer: Buffer, ext: string): Promise<{ key: string }> {
    const safeExt = ext.startsWith(".") ? ext : `.${ext}`;
    const key = `${orgId}/${randomUUID()}${safeExt}`;
    await mkdir(join(this.uploadsRoot, orgId), { recursive: true });
    await writeFile(join(this.uploadsRoot, key), buffer);
    return { key };
  }

  /** Open a stored file for streaming — only if it belongs to the caller's org. */
  async open(user: AuthUser, key: string) {
    // The org prefix is the tenancy boundary; the JWT's orgId must match it.
    if (!key.startsWith(`${user.orgId}/`)) {
      throw new ApiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "You cannot access this file");
    }
    // Portal roles (BG-2) are further restricted to files that belong to their
    // OWN resident record(s) — a resident/guardian must not read another
    // resident's document just because it lives in the same org. Owner/staff
    // keep the org-level access they always had.
    if (user.role === "guardian" || user.role === "resident") {
      if (!(await this.portalOwnsFile(user, key))) {
        throw new ApiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "You cannot access this file");
      }
    }
    const target = normalize(join(this.uploadsRoot, key));
    if (!target.startsWith(this.uploadsRoot + sep)) {
      throw new ApiError(HttpStatus.FORBIDDEN, "FORBIDDEN", "Invalid file path");
    }
    try {
      const info = await stat(target);
      if (!info.isFile()) throw new Error("not a file");
    } catch {
      throw ApiError.notFound("File");
    }
    return this.streamFor(target);
  }

  /** True when `key` is a file attached to one of the portal subject's residents. */
  private async portalOwnsFile(user: AuthUser, key: string): Promise<boolean> {
    const residentIds = await resolvePortalResidentIds(this.prisma, user);
    if (residentIds.length === 0) return false;
    const asDocument = await this.prisma.residentDocument.findFirst({
      where: { orgId: user.orgId, residentId: { in: residentIds }, fileKey: key },
      select: { id: true },
    });
    if (asDocument) return true;
    const asResidentFile = await this.prisma.resident.findFirst({
      where: {
        orgId: user.orgId,
        id: { in: residentIds },
        OR: [{ photoKey: key }, { idDocKey: key }],
      },
      select: { id: true },
    });
    return asResidentFile !== null;
  }

  private streamFor(target: string) {
    const ext = extname(target).toLowerCase();
    const contentType =
      ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".png"
          ? "image/png"
          : ext === ".pdf"
            ? "application/pdf"
            : "application/octet-stream";
    return { stream: createReadStream(target), contentType };
  }
}

/** API path (relative) the frontend fetches with its bearer token. */
export function fileUrl(key: string): string {
  return `/api/v1/files/${key}`;
}
