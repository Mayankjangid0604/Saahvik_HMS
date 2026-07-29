import { Global, Module } from "@nestjs/common";
import { SequenceService } from "../common/sequence.service";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService, SequenceService],
  exports: [PrismaService, SequenceService],
})
export class PrismaModule {}
