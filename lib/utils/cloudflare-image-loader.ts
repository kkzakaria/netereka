export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (src.startsWith("blob:") || src.startsWith("data:")) return src;

  if (process.env.NODE_ENV === "development") {
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}w=${width}`;
  }

  const params = `width=${width},quality=${quality ?? 75},format=auto`;
  const path = src.startsWith("/") ? src.slice(1) : src;
  return `/cdn-cgi/image/${params}/${path}`;
}
