import { Injectable, Logger } from "@nestjs/common";

/**
 * Password-reset mail sender. AWS SES (AWS_SES_FROM_EMAIL / AWS_SES_REGION)
 * is the production transport; until the SES SDK is wired in, links are
 * logged so the flow stays testable end-to-end in dev.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const from = process.env.AWS_SES_FROM_EMAIL;
    if (!from) {
      this.logger.log(`[dev] Password reset for ${to}: ${resetUrl}`);
      return;
    }
    // SES integration point: send via @aws-sdk/client-ses using
    // AWS_SES_REGION with `from`. Deliberately not silently dropped.
    this.logger.warn(
      `SES transport not yet wired — reset link for ${to} logged instead: ${resetUrl}`,
    );
  }
}
