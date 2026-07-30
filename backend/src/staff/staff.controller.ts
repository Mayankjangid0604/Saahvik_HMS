import { Controller, Delete, Get, Inject, Param, Post, Put } from "@nestjs/common";
import { StaffRole, StaffStatus } from "@prisma/client";
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import type { AuthUser } from "../common/auth-user";
import { CurrentUser, Roles } from "../common/decorators";
import { ValidatedBody } from "../common/validated";
import { StaffService } from "./staff.service";

class AddStaffDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

/** All staff-management routes are owner only. */
@Controller("staff")
@Roles("owner")
export class StaffController {
  constructor(@Inject(StaffService) private readonly staff: StaffService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.staff.list(user);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.staff.get(user, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @ValidatedBody(AddStaffDto) dto: AddStaffDto) {
    return this.staff.create(user, dto);
  }

  @Put(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @ValidatedBody(UpdateStaffDto) dto: UpdateStaffDto) {
    return this.staff.update(user, id, dto);
  }

  @Delete(":id")
  deactivate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.staff.deactivate(user, id);
  }
}
