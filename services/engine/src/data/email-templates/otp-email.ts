interface OtpTemplateProps {
  code: string;
  mode: "signup" | "login";
}

/**
 * Render the OTP verification email body. Plain inline-styled HTML so it
 * works across every mail client. Replace with a templating engine (Resend
 * react-email, mjml, etc.) when you need richer layouts.
 */
export function generateOtpEmailHtml({ code, mode }: OtpTemplateProps): string {
  const greeting = mode === "signup" ? "Welcome" : "Hi there";
  const intent =
    mode === "signup"
      ? "Use the code below to finish creating your account."
      : "Use the code below to sign in.";

  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fafafa;padding:32px 0;font-family:'Inter',system-ui,-apple-system,sans-serif;color:#1c1917;">
  <tr>
    <td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="background:#ffffff;border-radius:16px;padding:40px;border:1px solid #e7e5e4;">
        <tr>
          <td>
            <p style="font-size:14px;letter-spacing:0.04em;color:#78716c;text-transform:uppercase;margin:0 0 8px;">Verification</p>
            <h1 style="font-size:24px;line-height:1.2;margin:0 0 16px;color:#0c0a09;">${greeting},</h1>
            <p style="font-size:16px;line-height:1.5;color:#44403c;margin:0 0 24px;">${intent}</p>
            <div style="font-size:32px;font-weight:700;letter-spacing:0.32em;background:#f5f5f4;border:1px solid #e7e5e4;border-radius:12px;padding:20px;text-align:center;color:#0c0a09;">
              ${code}
            </div>
            <p style="font-size:13px;line-height:1.5;color:#78716c;margin:24px 0 0;">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
