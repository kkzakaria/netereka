import { Resend } from "resend";
import { getEnv } from "@/lib/cloudflare/context";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const env = await getEnv();

    if (!env.RESEND_API_KEY) {
      console.warn("[email] RESEND_API_KEY not configured, skipping email");
      return { success: true };
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const from = env.RESEND_FROM_EMAIL || "NETEREKA <commandes@netereka.ci>";

    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
