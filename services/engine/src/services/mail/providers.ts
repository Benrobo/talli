export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface MailProvider {
  send(params: SendMailParams): Promise<void>;
}

/**
 * Plunk mail provider. Sends transactional email via the Plunk HTTP API.
 * Replace with another provider by implementing the `MailProvider` interface
 * and swapping the binding in `mail.service.ts`.
 */
export class PlunkProvider implements MailProvider {
  constructor(private apiKey: string) {}

  async send(params: SendMailParams): Promise<void> {
    const res = await fetch("https://api.useplunk.com/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        body: params.html,
        type: "html",
        ...(params.from ? { from: params.from } : {}),
        ...(params.replyTo ? { reply: params.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Plunk send failed: ${res.status} ${text}`);
    }
  }
}
