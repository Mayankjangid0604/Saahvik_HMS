import { Controller, Delete, Get, Inject, Param, Post, Put } from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import {
  CreatePurchaseDto,
  CreateVendorDto,
  PurchaseListParamsDto,
  UpdateVendorDto,
  VendorListParamsDto,
} from "./dto";
import { VendorsService } from "./vendors.service";

/**
 * @Roles decision: managing the vendor directory (create/update/deactivate) is
 * an owner-level, low-frequency admin action, so those routes are @Roles("owner")
 * — matching how rooms.controller gates structural changes. Reads are open to any
 * authenticated user. Recording a purchase is a routine day-to-day action that
 * reception/staff perform, so POST /purchases has NO @Roles (any authenticated
 * user) — consistent with the brief's default.
 */
@Controller("vendors")
export class VendorsController {
  constructor(@Inject(VendorsService) private readonly vendors: VendorsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @ValidatedQuery(VendorListParamsDto) params: VendorListParamsDto,
  ) {
    return this.vendors.listVendors(user, params);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.vendors.getVendor(user, id);
  }

  @Post()
  @Roles("owner")
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreateVendorDto) dto: CreateVendorDto) {
    return this.vendors.createVendor(user, dto);
  }

  @Put(":id")
  @Roles("owner")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @ValidatedBody(UpdateVendorDto) dto: UpdateVendorDto,
  ) {
    return this.vendors.updateVendor(user, id, dto);
  }

  @Delete(":id")
  @Roles("owner")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.vendors.deactivateVendor(user, id);
  }
}

@Controller("purchases")
export class PurchasesController {
  constructor(@Inject(VendorsService) private readonly vendors: VendorsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @ValidatedQuery(PurchaseListParamsDto) params: PurchaseListParamsDto,
  ) {
    return this.vendors.listPurchases(user, params);
  }

  @Get("summary")
  summary(
    @CurrentUser() user: AuthUser,
    @ValidatedQuery(PurchaseListParamsDto) params: PurchaseListParamsDto,
  ) {
    return this.vendors.purchaseSummary(user, params);
  }

  // No @Roles — recording purchases is a routine action any authenticated user does.
  @Post()
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreatePurchaseDto) dto: CreatePurchaseDto) {
    return this.vendors.createPurchase(user, dto);
  }
}
