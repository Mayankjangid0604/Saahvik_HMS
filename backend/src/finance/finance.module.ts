import { Module } from "@nestjs/common";
import { DepositsService } from "./deposits.service";
import { DiscountsService } from "./discounts.service";
import { FeesService } from "./fees.service";
import {
  DepositsController,
  DiscountsController,
  DuesController,
  FeesController,
  InvoicesController,
  PaymentsController,
} from "./finance.controllers";
import { InvoicesService } from "./invoices.service";
import { PaymentsService } from "./payments.service";

@Module({
  controllers: [
    PaymentsController,
    DuesController,
    FeesController,
    InvoicesController,
    DepositsController,
    DiscountsController,
  ],
  providers: [PaymentsService, FeesService, InvoicesService, DepositsService, DiscountsService],
  exports: [PaymentsService],
})
export class FinanceModule {}
