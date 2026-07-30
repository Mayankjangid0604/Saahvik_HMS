import { Module } from "@nestjs/common";
import { WingsController } from "./wings.controller";
import { WingsService } from "./wings.service";

@Module({
  controllers: [WingsController],
  providers: [WingsService],
})
export class WingsModule {}
