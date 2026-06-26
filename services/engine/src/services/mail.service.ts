import { sendEmail } from "../config/cloudflare/cf-email.js";
import { generateOtpEmailHtml } from "../data/email-templates/otp-email.js";

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Mail orchestration over Cloudflare email sending. Adds a friendly footer
 * before handing off to the Cloudflare email API.
 */
class MailService {
  private withFooter(html: string): string {
    return `${html}
      <p style="font-size:12px;color:#9b8673;margin:24px auto 0;max-width:560px;line-height:1.6;text-align:center;">
        Questions? Reply to this email and we'll help.
      </p>`;
  }

  async send(params: SendMailParams): Promise<void> {
    await sendEmail({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: this.withFooter(params.html),
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
