"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function LoadMoreButton({
  slug,
  nextPage,
}: {
  slug: string;
  nextPage: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(nextPage));
      router.push(`/c/${slug}?${params.toString()}`);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-xl border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
    >
      {isPending ? "Chargement\u2026" : "Charger plus"}
    </button>
  );
}
