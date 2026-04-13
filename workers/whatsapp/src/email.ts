export async function sendOtpEmail(
  apiKey: string,
  to: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "NETEREKA <commandes@netereka.ci>",
      to,
      subject: `Votre code de vérification NETEREKA: ${otpCode}`,
      html: `<p>Bonjour,</p><p>Votre code de vérification WhatsApp NETEREKA est : <strong>${otpCode}</strong></p><p>Ce code expire dans 10 minutes.</p><p>L'équipe NETEREKA</p>`,
    }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { message?: string };
    return { success: false, error: data.message ?? "Email sending failed" };
  }

  return { success: true };
}
