import { Global, Module } from "@nestjs/common";
import { XlsxService } from "./xlsx.service";

/** Global so any report path can render Excel without re-importing (mirrors PdfModule usage). */
@Global()
@Module({
  providers: [XlsxService],
  exports: [XlsxService],
})
export class XlsxModule {}
