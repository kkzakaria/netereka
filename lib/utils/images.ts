const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_URL || "/images";

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "/images/placeholder.webp";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  return `${R2_PUBLIC_URL}/${path}`;
}
