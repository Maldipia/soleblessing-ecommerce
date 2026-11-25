// Native email sender — NO Google Apps Script dependency. The serverless
// functions send branded emails directly through one of two providers:
//   1. Resend (RESEND_API_KEY [+ EMAIL_FROM]) — best: from @soleblessingofficial.com
//   2. Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) — sends from her Gmail
// With neither configured, callers get { notConfigured: true } and surface a
// clear "not configured yet" message — nothing silently fails.
export async function sendBrandedEmail({ to, subject, html }) {
  const RESEND = process.env.RESEND_API_KEY || '';
  if (RESEND) {
    // Pia's rule: NEVER fall back to onboarding@resend.dev — a missing
    // EMAIL_FROM is a configuration error, not a reason to send as Resend.
    const FROM = process.env.EMAIL_FROM || '';
    if (!FROM) return { success: false, notConfigured: true, message: 'EMAIL_FROM not set — sender address must be configured and approved first' };
    // Replies go to the SoleBlessing Gmail inbox (old behavior preserved).
    const REPLY_TO = process.env.EMAIL_REPLY_TO || '';
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(REPLY_TO ? { reply_to: [REPLY_TO] } : {}) }),
      });
      const out = await r.json().catch(() => null);
      if (!r.ok) return { success: false, message: (out && (out.message || out.error)) || `resend error ${r.status}` };
      return { success: true, id: out && out.id, provider: 'resend' };
    } catch (e) { return { success: false, message: String(e && e.message || e) }; }
  }
  const USER = process.env.GMAIL_USER || '';
  const PASS = process.env.GMAIL_APP_PASSWORD || '';
  if (USER && PASS) {
    try {
      const nodemailer = (await import('nodemailer')).default;
      const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: USER, pass: PASS } });
      const info = await t.sendMail({ from: `SoleBlessing <${USER}>`, to, subject, html });
      return { success: true, id: info.messageId, provider: 'gmail' };
    } catch (e) { return { success: false, message: String(e && e.message || e) }; }
  }
  return { success: false, notConfigured: true,
    message: 'email sending not configured yet — add a Gmail App Password or Resend API key' };
}
