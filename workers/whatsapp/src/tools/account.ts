import type { ToolContext, ToolResult } from "../types";
import { sendOtpEmail } from "../email";

interface UserRow {
  id: string;
  email: string;
}

interface SessionOtpRow {
  otp_code: string | null;
  otp_expires_at: string | null;
  user_id: string | null;
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function linkAccount(
  ctx: ToolContext,
  params: { email: string }
): Promise<ToolResult> {
  if (ctx.session.is_verified === 1 && ctx.session.user_id) {
    return { success: false, error: "Account already linked to this WhatsApp session." };
  }

  const user = await ctx.db
    .prepare("SELECT id, email FROM user WHERE LOWER(email) = LOWER(?)")
    .bind(params.email)
    .first<UserRow>();

  if (!user) {
    return { success: false, error: "No account found with that email address." };
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await ctx.db
    .prepare(
      `UPDATE whatsapp_sessions
       SET otp_code = ?, otp_expires_at = ?, user_id = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(otp, expiresAt, user.id, new Date().toISOString(), ctx.session.id)
    .run();

  if (!ctx.env.RESEND_API_KEY) {
    console.error("[account] RESEND_API_KEY not configured, cannot send OTP");
    return { success: false, error: "Le service email n'est pas disponible. Veuillez réessayer plus tard." };
  }

  const emailResult = await sendOtpEmail(ctx.env.RESEND_API_KEY, user.email, otp);
  if (!emailResult.success) {
    console.error(`[account] OTP email failed for ${user.email}: ${emailResult.error}`);
    return { success: false, error: "Impossible d'envoyer l'email de vérification. Veuillez réessayer." };
  }

  return {
    success: true,
    data: { message: `Un code de vérification a été envoyé à ${user.email}. Envoyez-moi le code à 6 chiffres pour lier votre compte.` },
  };
}

export async function verifyOtp(
  ctx: ToolContext,
  params: { code: string }
): Promise<ToolResult> {
  const row = await ctx.db
    .prepare("SELECT otp_code, otp_expires_at, user_id FROM whatsapp_sessions WHERE id = ?")
    .bind(ctx.session.id)
    .first<SessionOtpRow>();

  if (!row?.otp_code || !row?.otp_expires_at) {
    return { success: false, error: "No verification pending. Please use the link account command first." };
  }

  if (new Date(row.otp_expires_at) < new Date()) {
    return { success: false, error: "Verification code has expired. Please request a new one." };
  }

  if (row.otp_code !== params.code) {
    return { success: false, error: "Invalid code. Please check and try again." };
  }

  await ctx.db
    .prepare(
      `UPDATE whatsapp_sessions
       SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL, updated_at = ?
       WHERE id = ?`
    )
    .bind(new Date().toISOString(), ctx.session.id)
    .run();

  // Update in-memory session
  ctx.session.is_verified = 1;
  ctx.session.user_id = row.user_id;

  return {
    success: true,
    data: { message: "Account successfully linked! You can now access your orders and account information." },
  };
}
