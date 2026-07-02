import { sendEmail } from "../config/cloudflare/cf-email.js";
import { generateOtpEmailHtml } from "../data/email-templates/otp-email.js";
import { generatePaymentReceiptHtml } from "../data/email-templates/payment-receipt.js";
import { generatePaymentFailedHtml } from "../data/email-templates/payment-failed.js";
import { generatePaymentRecoveredHtml } from "../data/email-templates/payment-recovered.js";
import { generateCollectionCompleteHtml } from "../data/email-templates/collection-complete.js";
import { generateWalletTopupHtml } from "../data/email-templates/wallet-topup.js";

interface PaymentReceiptProps {
  payerName: string;
  amount: number;
  purpose: string;
  from: string;
  to: string;
  reference: string;
  dateLabel: string;
}

interface PaymentFailedProps {
  payerName: string;
  amount: number;
  purpose: string;
  reference: string;
  retryUrl: string;
}

interface PaymentRecoveredProps {
  payerName: string;
  amount: number;
  purpose: string;
  reference: string;
  dateLabel: string;
}

interface CollectionCompleteProps {
  ownerName: string;
  title: string;
  totalCollected: number;
  memberCount: number;
}

interface WalletTopupProps {
  name: string;
  amount: number;
  newBalance: number;
  reference: string;
  dateLabel: string;
}

const naira = (amount: number): string => `₦${amount.toLocaleString("en-NG")}`;

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

  async sendPaymentReceipt(to: string, props: PaymentReceiptProps): Promise<void> {
    await this.send({
      to,
      subject: `Receipt — ${naira(props.amount)} for ${props.purpose}`,
      html: generatePaymentReceiptHtml(props),
    });
  }

  async sendPaymentFailed(to: string, props: PaymentFailedProps): Promise<void> {
    await this.send({
      to,
      subject: `We couldn't confirm your ${naira(props.amount)} payment`,
      html: generatePaymentFailedHtml(props),
    });
  }

  async sendPaymentRecovered(to: string, props: PaymentRecoveredProps): Promise<void> {
    await this.send({
      to,
      subject: `Confirmed — your ${naira(props.amount)} payment came through`,
      html: generatePaymentRecoveredHtml(props),
    });
  }

  async sendCollectionComplete(to: string, props: CollectionCompleteProps): Promise<void> {
    await this.send({
      to,
      subject: `${props.title} is fully funded — ${naira(props.totalCollected)} raised`,
      html: generateCollectionCompleteHtml(props),
    });
  }

  async sendWalletTopup(to: string, props: WalletTopupProps): Promise<void> {
    await this.send({
      to,
      subject: `${naira(props.amount)} added to your Talli wallet`,
      html: generateWalletTopupHtml(props),
    });
  }
}

export const mailService = new MailService();
export default mailService;
