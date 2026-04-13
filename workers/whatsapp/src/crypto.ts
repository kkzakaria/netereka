export async function verifySignature(
  body: string,
  signatureHeader: string,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader) return false;

  const [algo, receivedHash] = signatureHeader.split("=");
  if (algo !== "sha256" || !receivedHash) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computedHash = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHash === receivedHash;
}
