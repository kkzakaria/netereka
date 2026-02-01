"use client";

import { useRouter } from "next/navigation";

export function LoadMoreButton({
  slug,
  nextPage,
}: {
  slug: string;
  nextPage: number;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/c/${slug}?page=${nextPage}`)}
      className="rounded-xl border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
    >
      Charger plus
    </button>
  );
}
