import type { ToolContext, ToolResult } from "../types";
import { sendOtpEmail } from "../email";

interface UserRow {
  id: string;
  email: string;
}

interface SessionOtpRow {
  otp_code: string | null;
  otp_expires_at: string | null;
  pending_user_id: string | null;
}

function generateOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + (arr[0] % 900000));
}

// Uniform response used for every non-error outcome of linkAccount so the tool
// never reveals whether an email is registered (no account-existence oracle).
const LINK_UNIFORM_MESSAGE =
  "Si un compte existe pour cette adresse, un code de vérification a été envoyé. Envoyez-moi le code à 6 chiffres pour lier votre compte.";

// Rate-limit windows (KV TTL, seconds) and caps. Per-session throttles blind
// enumeration attempts; per-target-email throttles OTP email bombing of a
// specific victim across attacker-controlled numbers. See GHSA-6m6p.
const LINK_WINDOW_TTL = 3600;
const LINK_MAX_PER_SESSION = 5;
const LINK_MAX_PER_EMAIL = 3;

export async function linkAccount(
  ctx: ToolContext,
  params: { email: string }
): Promise<ToolResult> {
  if (ctx.session.is_verified === 1 && ctx.session.user_id) {
    return { success: false, error: "Account already linked to this WhatsApp session." };
  }

  const email = params.email.trim().toLowerCase();
  const sessionKey = `wa:link_attempts:session:${ctx.session.id}`;
  const emailKey = `wa:link_attempts:email:${email}`;

  const [sessionCountStr, emailCountStr] = await Promise.all([
    ctx.env.KV.get(sessionKey),
    ctx.env.KV.get(emailKey),
  ]);
  const sessionCount = sessionCountStr ? parseInt(sessionCountStr, 10) : 0;
  const emailCount = emailCountStr ? parseInt(emailCountStr, 10) : 0;

  if (sessionCount >= LINK_MAX_PER_SESSION || emailCount >= LINK_MAX_PER_EMAIL) {
    return {
      success: false,
      error: "Trop de demandes de vérification. Veuillez réessayer plus tard.",
    };
  }

  // Advance the per-session counter for every attempt (registered or not) so
  // blind enumeration is throttled regardless of the lookup result.
  await ctx.env.KV.put(sessionKey, String(sessionCount + 1), { expirationTtl: LINK_WINDOW_TTL });

  const user = await ctx.db
    .prepare("SELECT id, email FROM user WHERE LOWER(email) = LOWER(?)")
    .bind(email)
    .first<UserRow>();

  // Uniform response for unregistered emails — never disclose non-existence.
  if (!user) {
    return { success: true, data: { message: LINK_UNIFORM_MESSAGE } };
  }

  if (!ctx.env.RESEND_API_KEY) {
    // Return the uniform message (not a distinct error) so a missing key can't
    // be combined into an existence oracle; the failure is only logged.
    console.error("[account] RESEND_API_KEY not configured, cannot send OTP");
    return { success: true, data: { message: LINK_UNIFORM_MESSAGE } };
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Stage the target account as PENDING only. It must not become the trusted
  // ctx.session.user_id until the OTP emailed below is confirmed in verifyOtp;
  // otherwise an attacker who merely knows a victim's email would be linked
  // before proving ownership. See GHSA (OTP account-linking bypass).
  await ctx.db
    .prepare(
      `UPDATE whatsapp_sessions
       SET otp_code = ?, otp_expires_at = ?, pending_user_id = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(otp, expiresAt, user.id, new Date().toISOString(), ctx.session.id)
    .run();

  const emailResult = await sendOtpEmail(ctx.env.RESEND_API_KEY, user.email, otp);
  if (!emailResult.success) {
    console.error(`[account] OTP email failed for ${user.email}: ${emailResult.error}`);
    // Uniform response — do not turn a delivery failure into an oracle.
    return { success: true, data: { message: LINK_UNIFORM_MESSAGE } };
  }

  // Count successful sends per target email to cap bombing of that address.
  await ctx.env.KV.put(emailKey, String(emailCount + 1), { expirationTtl: LINK_WINDOW_TTL });

  return { success: true, data: { message: LINK_UNIFORM_MESSAGE } };
}

export async function verifyOtp(
  ctx: ToolContext,
  params: { code: string }
): Promise<ToolResult> {
  const row = await ctx.db
    .prepare("SELECT otp_code, otp_expires_at, pending_user_id FROM whatsapp_sessions WHERE id = ?")
    .bind(ctx.session.id)
    .first<SessionOtpRow>();

  if (!row?.otp_code || !row?.otp_expires_at || !row?.pending_user_id) {
    return { success: false, error: "No verification pending. Please use the link account command first." };
  }

  if (new Date(row.otp_expires_at) < new Date()) {
    return { success: false, error: "Verification code has expired. Please request a new one." };
  }

  if (row.otp_code !== params.code) {
    // Track failed attempts via KV to prevent brute-force
    const attemptsKey = `wa:otp_attempts:${ctx.session.id}`;
    const attemptsStr = await ctx.env.KV.get(attemptsKey);
    const attempts = (attemptsStr ? parseInt(attemptsStr, 10) : 0) + 1;

    if (attempts >= 5) {
      // Invalidate OTP after 5 failed attempts
      await ctx.db
        .prepare("UPDATE whatsapp_sessions SET otp_code = NULL, otp_expires_at = NULL, updated_at = datetime('now') WHERE id = ?")
        .bind(ctx.session.id)
        .run();
      await ctx.env.KV.delete(attemptsKey);
      return { success: false, error: "Trop de tentatives. Le code a été invalidé. Veuillez demander un nouveau code." };
    }

    await ctx.env.KV.put(attemptsKey, String(attempts), { expirationTtl: 600 });
    return { success: false, error: `Code incorrect (tentative ${attempts}/5). Vérifiez votre email et réessayez.` };
  }

  // OTP confirmed: promote the pending account to the trusted user_id and mark
  // the session verified, clearing the OTP + pending staging. The WHERE guard
  // requires the OTP/pending state we validated to still be present, so a
  // concurrent re-link or parallel verify that cleared pending_user_id cannot
  // cause us to persist user_id = NULL and still report success.
  const promote = await ctx.db
    .prepare(
      `UPDATE whatsapp_sessions
       SET is_verified = 1, user_id = pending_user_id, pending_user_id = NULL,
           otp_code = NULL, otp_expires_at = NULL, updated_at = ?
       WHERE id = ? AND otp_code = ? AND pending_user_id IS NOT NULL`
    )
    .bind(new Date().toISOString(), ctx.session.id, row.otp_code)
    .run();

  if (promote.meta.changes === 0) {
    // Pending/OTP state changed underneath us — do not mark the session verified.
    return { success: false, error: "La vérification a échoué. Veuillez demander un nouveau code." };
  }

  // Update in-memory session
  ctx.session.is_verified = 1;
  ctx.session.user_id = row.pending_user_id;
  ctx.session.pending_user_id = null;

  return {
    success: true,
    data: { message: "Account successfully linked! You can now access your orders and account information." },
  };
}
