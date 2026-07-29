import { Body, Query, ValidationPipe, type Type } from "@nestjs/common";

/**
 * Frozen decision 5, applied to pipes: esbuild-style runtimes (tsx) strip
 * design:paramtypes metadata, which makes the global ValidationPipe silently
 * SKIP DTO validation and transformation (verified in integration testing —
 * `?limit=100` reached Prisma as the string "100"). Just like @Inject() for
 * DI, the DTO class must be named explicitly. Always use these instead of
 * bare @Body()/@Query() when the parameter is a DTO class.
 */
const pipeFor = (expectedType: Type<unknown>) =>
  new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    expectedType,
  });

export const ValidatedBody = (cls: Type<unknown>): ParameterDecorator => Body(pipeFor(cls));
export const ValidatedQuery = (cls: Type<unknown>): ParameterDecorator => Query(pipeFor(cls));
