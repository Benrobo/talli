import env from "../env.js";
import logger from "../../lib/logger.js";
import { cfClient } from "./client.js";

type SendEmailProps = {
  from?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(props: SendEmailProps) {
  try {
    const response = await cfClient.emailSending.send({
      account_id: env.CLOUDFLARE_ACCOUNT_ID,
      from: `${props?.from ?? "Talli"} <${env.MAIL_FROM}>`,
      to: props.to,
      subject: props.subject,
      html: props.html,
      text: props.text ?? undefined,
    });
    return response.delivered;
  } catch (err) {
    logger.error("[cloudflare/cf-email] Failed to send email:", err);
    throw err;
  }
}
