import { Inject, Injectable } from "@nestjs/common";
import type { AdmissionFieldDefinition, Prisma } from "@prisma/client";
import { AdmissionFieldType } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { ApiError } from "../common/api-error";
import type { AuthUser } from "../common/auth-user";
import { toOrgDto } from "../common/mappers";
import { PrismaService } from "../prisma/prisma.service";
import { ACTIVE_RESIDENT_CAP } from "../residents/residents.service";
import { TOTAL_LOGIN_LIMIT } from "../staff/staff.service";
import { DEFAULT_ADMISSION_FIELDS } from "./admission-defaults";

/**
 * Feature 6 — max org-defined custom admission fields (fields with
 * isDefault=false). Beginner-tier cap; documented here as the single source.
 */
export const MAX_CUSTOM_ADMISSION_FIELDS = 10;

export interface AdmissionFieldInput {
  key: string;
  label: string;
  type: AdmissionFieldType;
  required: boolean;
  isDefault?: boolean;
  options?: string[];
  validation?: "aadhaar" | "pincode";
  autoFill?: "today" | "formNo";
}

function toFieldDto(f: AdmissionFieldDefinition) {
  return {
    key: f.key,
    label: f.label,
    type: f.fieldType,
    required: f.required,
    isDefault: f.isDefault,
    options: Array.isArray(f.options) ? (f.options as string[]) : undefined,
    validation: (f.validation ?? undefined) as "aadhaar" | "pincode" | undefined,
    autoFill: (f.autoFill ?? undefined) as "today" | "formNo" | undefined,
  };
}

@Injectable()
export class SettingsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  // ---------- org ----------

  async getOrg(user: AuthUser) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: user.orgId } });
    return toOrgDto(org);
  }

  async updateOrg(
    user: AuthUser,
    input: Partial<{
      name: string;
      hostelName: string;
      addressLine: string;
      city: string;
      state: string;
      pincode: string;
      phone: string;
      email: string;
      gstin: string;
      // GST config (feature 8) + branding colors (feature 17).
      gstEnabled: boolean;
      gstRatePercent: number;
      gstInclusive: boolean;
      themeColorPrimary: string;
      themeColorAccent: string;
      setupComplete: boolean;
    }>,
  ) {
    const org = await this.prisma.organization.update({
      where: { id: user.orgId },
      data: {
        name: input.name,
        hostelName: input.hostelName,
        addressLine: input.addressLine,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        phone: input.phone,
        email: input.email,
        gstin: input.gstin,
        gstEnabled: input.gstEnabled,
        gstRatePercent: input.gstRatePercent,
        gstInclusive: input.gstInclusive,
        themeColorPrimary: input.themeColorPrimary,
        themeColorAccent: input.themeColorAccent,
        onboardingCompleted: input.setupComplete,
      },
    });
    await this.audit.log(user, {
      action: "updated_org_settings",
      entityType: "organization",
      entityId: org.id,
      entityLabel: org.name,
      details: { changes: Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) },
    });
    return toOrgDto(org);
  }

  /**
   * Set the org logo (feature 17). The file is already stored via FilesService
   * (the controller uploads it, then passes the key); we just record the key,
   * which toOrgDto exposes as an authenticated /files URL.
   */
  async setLogo(user: AuthUser, key: string) {
    const org = await this.prisma.organization.update({
      where: { id: user.orgId },
      data: { logoKey: key },
    });
    await this.audit.log(user, {
      action: "updated_org_logo",
      entityType: "organization",
      entityId: org.id,
      entityLabel: org.name,
    });
    return toOrgDto(org);
  }

  // ---------- subscription ----------

  async getSubscription(user: AuthUser) {
    const [org, staffCount, ownerCount, activeResidents] = await this.prisma.$transaction([
      this.prisma.organization.findUniqueOrThrow({ where: { id: user.orgId } }),
      this.prisma.staff.count({ where: { orgId: user.orgId, status: "active" } }),
      this.prisma.owner.count({ where: { orgId: user.orgId } }),
      this.prisma.resident.count({ where: { orgId: user.orgId, status: { not: "alumni" } } }),
    ]);
    const renews = new Date(org.planStartDate ?? org.createdAt);
    const now = new Date();
    renews.setFullYear(now.getFullYear(), now.getMonth() + 1);
    return {
      plan: org.plan,
      planLabel: "Basic",
      pricePaisaPerMonth: 99900,
      renewsOn: renews.toISOString(),
      limits: { staff: TOTAL_LOGIN_LIMIT, residents: ACTIVE_RESIDENT_CAP, hostels: 1 },
      usage: { staff: staffCount + ownerCount, residents: activeResidents, hostels: 1 },
    };
  }

  // ---------- admission form ----------

  async getAdmissionForm(user: AuthUser) {
    const fields = await this.prisma.admissionFieldDefinition.findMany({
      where: { orgId: user.orgId },
      orderBy: { sortOrder: "asc" },
    });
    return { fields: fields.map(toFieldDto) };
  }

  /**
   * Full-config replace: upserts by key, deletes fields no longer present,
   * takes array order as sortOrder. (Subsumes create/update/delete/reorder.)
   */
  async updateAdmissionForm(user: AuthUser, fields: AdmissionFieldInput[]) {
    const keys = fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      throw ApiError.badRequest("Duplicate field keys in admission form");
    }
    // Feature 6 — cap org-defined CUSTOM fields (isDefault === false). The
    // built-in default fields don't count toward the cap. This is the single
    // custom-fields mechanism (we reuse AdmissionFieldDefinition rather than
    // inventing a second one); keep the cap here as the documented limit.
    const customCount = fields.filter((f) => !f.isDefault).length;
    if (customCount > MAX_CUSTOM_ADMISSION_FIELDS) {
      throw ApiError.badRequest(
        `You can define at most ${MAX_CUSTOM_ADMISSION_FIELDS} custom fields (you have ${customCount})`,
        { limit: MAX_CUSTOM_ADMISSION_FIELDS, count: customCount },
      );
    }
    for (const f of fields) {
      // Feature 19 (strengthening) — key must be a safe identifier so it can key
      // into Resident.admissionData Json without collisions/injection surprises.
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(f.key)) {
        throw ApiError.badRequest(
          `Field key "${f.key}" must start with a letter and contain only letters, numbers, or underscores`,
        );
      }
      if (f.type === "select" && (!f.options || f.options.length === 0)) {
        throw ApiError.badRequest(`Field "${f.label}" needs at least one option`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.admissionFieldDefinition.deleteMany({
        where: { orgId: user.orgId, key: { notIn: keys } },
      });
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const data = {
          label: f.label,
          fieldType: f.type,
          options: f.options as Prisma.InputJsonValue | undefined,
          required: f.required,
          isDefault: f.isDefault ?? false,
          validation: f.validation ?? null,
          autoFill: f.autoFill ?? null,
          sortOrder: i,
        };
        await tx.admissionFieldDefinition.upsert({
          where: { orgId_key: { orgId: user.orgId, key: f.key } },
          create: { orgId: user.orgId, key: f.key, ...data },
          update: data,
        });
      }
      await this.audit.log(
        user,
        {
          action: "updated_admission_form",
          entityType: "admission_form",
          entityId: user.orgId,
          entityLabel: "Admission form",
          details: { fieldCount: fields.length },
        },
        tx,
      );
    });
    return this.getAdmissionForm(user);
  }

  async resetAdmissionForm(user: AuthUser) {
    await this.prisma.$transaction(async (tx) => {
      await tx.admissionFieldDefinition.deleteMany({ where: { orgId: user.orgId } });
      await tx.admissionFieldDefinition.createMany({
        data: DEFAULT_ADMISSION_FIELDS.map((f, i) => ({
          orgId: user.orgId,
          key: f.key,
          label: f.label,
          fieldType: f.fieldType,
          options: f.options as Prisma.InputJsonValue | undefined,
          required: f.required,
          isDefault: true,
          validation: f.validation,
          autoFill: f.autoFill,
          sortOrder: i,
        })),
      });
      await this.audit.log(
        user,
        {
          action: "reset_admission_form",
          entityType: "admission_form",
          entityId: user.orgId,
          entityLabel: "Admission form",
        },
        tx,
      );
    });
    return this.getAdmissionForm(user);
  }

  // ---------- notification preferences ----------

  async getNotificationPreferences(user: AuthUser) {
    const pref = await this.prisma.notificationPreference.upsert({
      where: {
        orgId_userId_userType: { orgId: user.orgId, userId: user.userId, userType: user.role },
      },
      create: { orgId: user.orgId, userId: user.userId, userType: user.role },
      update: {},
    });
    return stripPrefRow(pref);
  }

  async updateNotificationPreferences(
    user: AuthUser,
    input: Partial<{
      duesReminder: boolean;
      paymentReceived: boolean;
      newComplaint: boolean;
      complaintResolved: boolean;
      weeklySummary: boolean;
      channelInApp: boolean;
      channelEmail: boolean;
    }>,
  ) {
    const pref = await this.prisma.notificationPreference.upsert({
      where: {
        orgId_userId_userType: { orgId: user.orgId, userId: user.userId, userType: user.role },
      },
      create: { orgId: user.orgId, userId: user.userId, userType: user.role, ...input },
      update: input,
    });
    return stripPrefRow(pref);
  }
}

function stripPrefRow(pref: {
  duesReminder: boolean;
  paymentReceived: boolean;
  newComplaint: boolean;
  complaintResolved: boolean;
  weeklySummary: boolean;
  channelInApp: boolean;
  channelEmail: boolean;
}) {
  return {
    duesReminder: pref.duesReminder,
    paymentReceived: pref.paymentReceived,
    newComplaint: pref.newComplaint,
    complaintResolved: pref.complaintResolved,
    weeklySummary: pref.weeklySummary,
    channelInApp: pref.channelInApp,
    channelEmail: pref.channelEmail,
  };
}
