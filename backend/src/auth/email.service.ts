import { Injectable, Logger } from "@nestjs/common";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

/**
 * Transactional mail via AWS SES.
 *
 * Both senders are env-gated on AWS_SES_FROM_EMAIL: without it the message is
 * logged and the call resolves, so local dev and tests run without AWS
 * credentials. With it set, mail is actually sent — a send failure throws, so
 * a broken transport surfaces instead of silently dropping a verification code.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: SESClient | null = null;

  /** Lazily built so importing this module never requires AWS config. */
  private getClient(): SESClient {
    if (!this.client) {
      this.client = new SESClient({ region: process.env.AWS_SES_REGION ?? "ap-south-1" });
    }
    return this.client;
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const from = process.env.AWS_SES_FROM_EMAIL;
    if (!from) {
      this.logger.log(`[dev] Password reset for ${to}: ${resetUrl}`);
      return;
    }
    await this.send({
      from,
      to,
      subject: "Reset your Saahvik password",
      text:
        `Open the link below to set a new password. It expires in 1 hour.\n\n${resetUrl}\n\n` +
        `If you didn't ask for this, you can ignore this email.`,
      html:
        `<p>Open the link below to set a new password. It expires in 1 hour.</p>` +
        `<p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>` +
        `<p style="color:#64748b;font-size:12px">If you didn't ask for this, you can ignore this email.</p>`,
    });
  }

  async sendOtpEmail(to: string, code: string): Promise<void> {
    const from = process.env.AWS_SES_FROM_EMAIL;
    if (!from) {
      this.logger.log(`[dev] Email verification code for ${to}: ${code}`);
      return;
    }
    await this.send({
      from,
      to,
      subject: `${code} is your Saahvik verification code`,
      text:
        `Your Saahvik email verification code is ${code}. It expires in 10 minutes.\n\n` +
        `If you didn't ask for this, you can ignore this email.`,
      html:
        `<p>Your Saahvik email verification code is:</p>` +
        `<p style="font-size:28px;font-weight:700;letter-spacing:6px;font-family:monospace">${escapeHtml(code)}</p>` +
        `<p>It expires in 10 minutes.</p>` +
        `<p style="color:#64748b;font-size:12px">If you didn't ask for this, you can ignore this email.</p>`,
    });
  }

  private async send(msg: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const command = new SendEmailCommand({
      Source: msg.from,
      Destination: { ToAddresses: [msg.to] },
      Message: {
        Subject: { Data: msg.subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: msg.text, Charset: "UTF-8" },
          Html: { Data: msg.html, Charset: "UTF-8" },
        },
      },
    });
    try {
      await this.getClient().send(command);
    } catch (err) {
      // Logged with the recipient (never the code/link) so a delivery outage
      // is diagnosable from logs alone; rethrown so the caller can react.
      this.logger.error(`SES send failed for ${msg.to}: ${(err as Error).message}`);
      throw err;
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
