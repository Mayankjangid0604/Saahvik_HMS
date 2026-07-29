import "dotenv/config";
import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { ResponseInterceptor } from "./common/response.interceptor";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");

  // Explicit allow-list from CORS_ORIGINS (never *); see HANDOFF.md.
  const corsOrigins = (
    process.env.CORS_ORIGINS ??
    "https://app.saahvik.com,http://localhost:5173,http://localhost:4200"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      // esbuild-style runtimes strip design:type metadata, so conversions are
      // always explicit (@Type decorators) — never implicit.
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Saahvik API listening on http://localhost:${port}/api/v1`, "Bootstrap");
}

void bootstrap();
