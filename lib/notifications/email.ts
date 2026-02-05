import { Resend } from "resend";
import { getEnv } from "@/lib/cloudflare/context";

let resendInstance: Resend | null = null;

async function getResend(): Promise<Resend> {
  if (resendInstance) return resendInstance;
  const env = await getEnv();
  resendInstance = new Resend(env.RESEND_API_KEY);
  return resendInstance;
}

async function getFromAddress(): Promise<string> {
  const env = await getEnv();
  return env.RESEND_FROM_EMAIL || "NETEREKA <commandes@netereka.ci>";
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = await getResend();
    const from = await getFromAddress();

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
