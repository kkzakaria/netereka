export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "/images/placeholder.webp";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_R2_URL || "/images";
  return `${base}/${path}`;
}
