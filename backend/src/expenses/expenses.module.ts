import { Module } from "@nestjs/common";
import { ExpenseCategoriesController, ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";

@Module({
  controllers: [ExpensesController, ExpenseCategoriesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
