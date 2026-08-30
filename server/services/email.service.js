/**
 * email.service.js
 *
 * Thin wrapper around nodemailer for transactional email (currently just
 * password-reset links).
 *
 * Follows the same optional-external-service pattern used elsewhere in the
 * app (embeddings, Redis rate limiting, LLM calls): if SMTP isn't
 * configured, the app doesn't fail the request — it logs the link to the
 * server console instead, so forgot-password still works end-to-end in
 * local dev / offline environments without requiring real email creds.
 */
import nodemailer from 'nodemailer';

let transporter = null;

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!hasSmtpConfig()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Sends a password-reset email. Never throws — a delivery failure (or
 * missing SMTP config) falls back to logging the link so the reset flow
 * still works in dev/offline. The caller should NOT reveal delivery status
 * to the client — that would leak whether an email address is registered.
 */
export async function sendPasswordResetEmail(toEmail, resetUrl) {
  const client = getTransporter();

  if (!client) {
    console.warn(`[email fallback — SMTP not configured] Password reset link for ${toEmail}: ${resetUrl}`);
    return { delivered: false };
  }

  try {
    await client.sendMail({
      from: process.env.SMTP_FROM || 'SkillPilot <no-reply@skillpilot.app>',
      to: toEmail,
      subject: 'Reset your SkillPilot password',
      text:
        `We received a request to reset your SkillPilot password.\n\n` +
        `Open this link to choose a new one (valid for 1 hour):\n${resetUrl}\n\n` +
        `If you didn't request this, you can safely ignore this email.`,
      html:
        `<p>We received a request to reset your SkillPilot password.</p>` +
        `<p><a href="${resetUrl}">Click here to choose a new password</a> (valid for 1 hour).</p>` +
        `<p>If you didn't request this, you can safely ignore this email.</p>`,
    });
    return { delivered: true };
  } catch (err) {
    console.error('Password reset email failed to send, falling back to console log:', err.message);
    console.warn(`[email fallback — send error] Password reset link for ${toEmail}: ${resetUrl}`);
    return { delivered: false };
  }
}
