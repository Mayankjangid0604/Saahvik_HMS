import { SearchEntity } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * GET /search query — global cross-entity search.
 * `entity` narrows the search to one entity type; omit (or "all") to search
 * every type the caller's role can see. `limit` caps the hits per group.
 */
export class GlobalSearchDto {
  @IsString()
  @IsNotEmpty()
  term!: string;

  @IsOptional()
  @IsString()
  entity?: string; // SearchEntity | "all"

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/** POST /search/saved — persist a per-user saved search. */
export class CreateSavedSearchDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(SearchEntity)
  entity!: SearchEntity;

  /** Opaque filter blob, replayed verbatim by the client. */
  @IsObject()
  query!: Record<string, unknown>;
}
