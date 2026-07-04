-- Custom SQL migration file, put your code below! --

-- Security remediation (GHSA-4v42): before this release, findOrCreateSession
-- auto-linked and auto-verified a WhatsApp session whenever the inbound number
-- matched an unverified, self-asserted user.phone. Existing rows created that
-- way still carry user_id + is_verified = 1 and would remain trusted by the
-- order tools. There is no provenance flag to tell phone-auto-verified sessions
-- apart from genuinely OTP-verified ones, so conservatively reset every session
-- that carries link/verification/OTP state to unlinked/unverified. Affected
-- users simply re-link once via the email-OTP flow (link_account + verifyOtp).
-- This is a data reset, not a schema change.
--
-- The WHERE clause scopes the write to rows that actually hold state, so
-- already-clean sessions are skipped (no full-table rewrite); whatsapp_sessions
-- holds one row per WhatsApp sender and is small in practice.
UPDATE whatsapp_sessions
SET user_id = NULL,
    pending_user_id = NULL,
    is_verified = 0,
    otp_code = NULL,
    otp_expires_at = NULL,
    updated_at = datetime('now')
WHERE user_id IS NOT NULL
   OR pending_user_id IS NOT NULL
   OR is_verified <> 0
   OR otp_code IS NOT NULL
   OR otp_expires_at IS NOT NULL;
