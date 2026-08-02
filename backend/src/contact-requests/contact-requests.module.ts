import { Module } from "@nestjs/common";
import {
  ContactRequestsController,
  PublicContactRequestController,
} from "./contact-requests.controller";
import { ContactRequestsService } from "./contact-requests.service";
import { ContactRequestRateLimitGuard } from "./rate-limit.guard";

@Module({
  controllers: [PublicContactRequestController, ContactRequestsController],
  // The limiter is a provider so its bucket Map is a singleton across requests.
  providers: [ContactRequestsService, ContactRequestRateLimitGuard],
})
export class ContactRequestsModule {}
