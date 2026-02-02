"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function LoadMoreSearch({ nextPage }: { nextPage: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`/search?${params.toString()}`);
  };

  return (
    <button
      onClick={handleClick}
      className="rounded-xl border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      Charger plus
    </button>
  );
}
