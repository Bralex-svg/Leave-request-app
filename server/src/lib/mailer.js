const RESEND_API_URL = 'https://api.resend.com/emails';

/**
 * Sends an email via Resend's HTTPS API. Never throws — logs and swallows
 * failures so a broken mail provider can never break the API request that
 * triggered it.
 *
 * Uses an HTTPS API rather than SMTP because free-tier Render (and most
 * free PaaS hosts) blocks outbound SMTP ports (25/465/587) but allows 443.
 */
export async function sendMail({ to, subject, html, text }) {
  if (!to) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[mailer] RESEND_API_KEY not configured — would send "${subject}" to ${to}`);
    return;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'LeaveFlow <onboarding@resend.dev>',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      })
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[mailer] Failed to send "${subject}" to ${to}: ${res.status} ${body}`);
    }
  } catch (err) {
    console.error(`[mailer] Failed to send "${subject}" to ${to}:`, err.message);
  }
}
