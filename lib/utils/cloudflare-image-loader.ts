export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (process.env.NODE_ENV === "development" || src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  const params = `width=${width},quality=${quality ?? 75},format=auto`;
  const path = src.startsWith("/") ? src.slice(1) : src;
  return `/cdn-cgi/image/${params}/${path}`;
}
