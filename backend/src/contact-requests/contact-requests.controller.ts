import { Controller, Get, HttpCode, HttpStatus, Inject, Post, UseGuards } from "@nestjs/common";
import { Public, Roles } from "../common/decorators";
import { ValidatedBody } from "../common/validated";
import { ContactRequestsService } from "./contact-requests.service";
import { CreateContactRequestDto } from "./dto";
import { ContactRequestRateLimitGuard } from "./rate-limit.guard";

/** Unauthenticated lead capture from the landing page. */
@Controller("public/contact-request")
export class PublicContactRequestController {
  constructor(
    @Inject(ContactRequestsService) private readonly contactRequests: ContactRequestsService,
  ) {}

  @Public()
  @UseGuards(ContactRequestRateLimitGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@ValidatedBody(CreateContactRequestDto) dto: CreateContactRequestDto) {
    return this.contactRequests.create(dto);
  }
}

/** Owner-only inbox for the leads captured above. */
@Controller("contact-requests")
export class ContactRequestsController {
  constructor(
    @Inject(ContactRequestsService) private readonly contactRequests: ContactRequestsService,
  ) {}

  @Get()
  @Roles("owner")
  list() {
    return this.contactRequests.list();
  }
}
