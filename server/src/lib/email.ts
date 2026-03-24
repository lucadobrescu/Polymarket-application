import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Verification Email ───────────────────────────────────────────────────────

export async function sendVerificationEmail(
  email: string,
  username: string,
  token: string
) {
  const verificationUrl = `http://localhost:3000/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Verify your PredictMarket account",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: white; padding: 40px;">
        <h1 style="color: #6366f1;">PredictMarket</h1>
        <p>Hi ${username},</p>
        <p>Thanks for signing up. Click the button below to verify your email.</p>
        <a href="${verificationUrl}"
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #94a3b8; font-size: 12px;">If you did not create an account, ignore this email.</p>
      </div>
    `,
  });
}

// ─── Password Reset Email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  email: string,
  username: string,
  token: string
) {
  const resetUrl = `http://localhost:3000/auth/reset-password?token=${token}`;

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Reset your PredictMarket password",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: white; padding: 40px;">
        <h1 style="color: #6366f1;">PredictMarket</h1>
        <p>Hi ${username},</p>
        <p>We received a request to reset your password. Click the button below to set a new password.</p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #94a3b8; font-size: 12px;">This link expires in 1 hour.</p>
        <p style="color: #94a3b8; font-size: 12px;">If you did not request a password reset, ignore this email.</p>
      </div>
    `,
  });
}