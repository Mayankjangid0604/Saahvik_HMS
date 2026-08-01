import { Module } from "@nestjs/common";
import { PurchasesController, VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";

@Module({
  controllers: [VendorsController, PurchasesController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
