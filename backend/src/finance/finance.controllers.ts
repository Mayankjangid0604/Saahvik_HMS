import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  Post,
  Put,
  Query,
  StreamableFile,
} from "@nestjs/common";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody, ValidatedQuery } from "../common/validated";
import { ListParamsDto } from "../common/pagination";
import { DepositsService } from "./deposits.service";
import { DiscountsService } from "./discounts.service";
import {
  ApplyDiscountDto,
  AssignFeeDto,
  CreateDepositDto,
  CreateDiscountDto,
  CreateFeeStructureDto,
  CreateInvoiceDto,
  DepositListParamsDto,
  ForfeitDepositDto,
  InvoiceListParamsDto,
  PaymentListParamsDto,
  RecordPaymentDto,
  RefundDepositDto,
  RefundPaymentDto,
} from "./dto";
import { FeesService } from "./fees.service";
import { InvoicesService } from "./invoices.service";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @ValidatedQuery(PaymentListParamsDto) params: PaymentListParamsDto) {
    return this.payments.list(user, params);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.payments.get(user, id);
  }

  /** Payment recording is available to staff too (access matrix). */
  @Post()
  record(@CurrentUser() user: AuthUser, @ValidatedBody(RecordPaymentDto) dto: RecordPaymentDto) {
    return this.payments.record(user, dto);
  }

  @Post("refund")
  refund(@CurrentUser() user: AuthUser, @ValidatedBody(RefundPaymentDto) dto: RefundPaymentDto) {
    return this.payments.refund(user, dto);
  }

  @Get(":id/receipt.pdf")
  @Header("Content-Type", "application/pdf")
  @Header("Content-Disposition", "inline")
  async receiptPdf(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return new StreamableFile(await this.payments.receiptPdf(user, id));
  }
}

@Controller("dues")
export class DuesController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @ValidatedQuery(ListParamsDto) params: ListParamsDto) {
    return this.payments.listDues(user, params);
  }

  @Get("summary")
  summary(@CurrentUser() user: AuthUser) {
    return this.payments.duesSummary(user);
  }
}

@Controller("fees")
export class FeesController {
  constructor(@Inject(FeesService) private readonly fees: FeesService) {}

  @Get("structures")
  listStructures(@CurrentUser() user: AuthUser) {
    return this.fees.listStructures(user);
  }

  @Post("structures")
  createStructure(@CurrentUser() user: AuthUser, @ValidatedBody(CreateFeeStructureDto) dto: CreateFeeStructureDto) {
    return this.fees.createStructure(user, dto);
  }

  @Delete("structures/:id")
  @Roles("owner")
  deleteStructure(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.fees.deleteStructure(user, id);
  }

  @Get("assignments")
  listAssignments(@CurrentUser() user: AuthUser, @ValidatedQuery(ListParamsDto) params: ListParamsDto) {
    return this.fees.listAssignments(user, params);
  }

  @Post("assignments")
  assign(@CurrentUser() user: AuthUser, @ValidatedBody(AssignFeeDto) dto: AssignFeeDto) {
    return this.fees.assign(user, dto);
  }

  @Delete("assignments/:id")
  removeAssignment(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.fees.removeAssignment(user, id);
  }
}

@Controller("invoices")
export class InvoicesController {
  constructor(@Inject(InvoicesService) private readonly invoices: InvoicesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @ValidatedQuery(InvoiceListParamsDto) params: InvoiceListParamsDto) {
    return this.invoices.list(user, params);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.invoices.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreateInvoiceDto) dto: CreateInvoiceDto) {
    return this.invoices.create(user, dto);
  }
}

@Controller("deposits")
export class DepositsController {
  constructor(@Inject(DepositsService) private readonly deposits: DepositsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @ValidatedQuery(DepositListParamsDto) params: DepositListParamsDto) {
    return this.deposits.list(user, params);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreateDepositDto) dto: CreateDepositDto) {
    return this.deposits.create(user, dto);
  }

  @Put(":id/refund")
  refund(@CurrentUser() user: AuthUser, @Param("id") id: string, @ValidatedBody(RefundDepositDto) dto: RefundDepositDto) {
    return this.deposits.refund(user, id, dto);
  }

  @Put(":id/forfeit")
  forfeit(@CurrentUser() user: AuthUser, @Param("id") id: string, @ValidatedBody(ForfeitDepositDto) dto: ForfeitDepositDto) {
    return this.deposits.forfeit(user, id, dto);
  }
}

@Controller("discounts")
export class DiscountsController {
  constructor(@Inject(DiscountsService) private readonly discounts: DiscountsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.discounts.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ValidatedBody(CreateDiscountDto) dto: CreateDiscountDto) {
    return this.discounts.create(user, dto);
  }

  @Put(":id/toggle")
  toggle(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.discounts.toggle(user, id);
  }

  @Post(":id/apply")
  apply(@CurrentUser() user: AuthUser, @Param("id") id: string, @ValidatedBody(ApplyDiscountDto) dto: ApplyDiscountDto) {
    return this.discounts.apply(user, id, dto);
  }
}
