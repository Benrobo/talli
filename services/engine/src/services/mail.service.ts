import env from "../config/env.js";
import logger from "../lib/logger.js";
import { PlunkProvider, type MailProvider, type SendMailParams } from "./mail/providers.js";
import { generateOtpEmailHtml } from "../data/email-templates/otp-email.js";

/**
 * Mail orchestration. Wraps a provider and adds default `from`/`replyTo` and
 * a friendly footer. When `PLUNK_API_KEY` is empty the service no-ops with a
 * warning so local development never bricks on mail failures.
 */
class MailService {
  private provider: MailProvider | null = env.PLUNK_API_KEY
    ? new PlunkProvider(env.PLUNK_API_KEY)
    : null;

  private get from(): string {
    return env.MAIL_FROM;
  }

  private get replyTo(): string {
    return env.MAIL_REPLY_TO ?? env.MAIL_FROM;
  }

  private withFooter(html: string): string {
    return `${html}
      <p style="font-size:12px;color:#9b8673;margin:24px auto 0;max-width:560px;line-height:1.6;text-align:center;">
        Questions? Reply to this email and we'll help.
      </p>`;
  }

  async send(params: SendMailParams): Promise<void> {
    if (!this.provider) {
      logger.warn("[mail] PLUNK_API_KEY is not configured; skipping email send");
      return;
    }

    await this.provider.send({
      from: params.from ?? this.from,
      to: params.to,
      subject: params.subject,
      html: this.withFooter(params.html),
      replyTo: params.replyTo ?? this.replyTo,
    });
  }

  async sendOtpEmail(to: string, code: string, mode: "signup" | "login"): Promise<void> {
    await this.send({
      to,
      subject: `${code} is your verification code`,
      html: generateOtpEmailHtml({ code, mode }),
    });
  }
}

export const mailService = new MailService();
export default mailService;
