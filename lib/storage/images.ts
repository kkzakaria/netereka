import { getR2 } from "@/lib/cloudflare/context";

export async function uploadToR2(
  file: File,
  key: string
): Promise<string> {
  const r2 = await getR2();
  const buffer = await file.arrayBuffer();
  await r2.put(key, buffer, {
    httpMetadata: { contentType: file.type },
  });
  return key;
}

export async function deleteFromR2(key: string): Promise<void> {
  const r2 = await getR2();
  await r2.delete(key);
}
