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
    ["verify"]
  );

  // Convert received hex hash to Uint8Array for timing-safe verify
  const receivedBytes = hexToBytes(receivedHash);
  if (!receivedBytes) return false;

  // crypto.subtle.verify performs a constant-time comparison internally
  return crypto.subtle.verify("HMAC", key, receivedBytes.buffer as ArrayBuffer, encoder.encode(body));
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substring(i, i + 2), 16);
    if (isNaN(byte)) return null;
    bytes[i / 2] = byte;
  }
  return bytes;
}
