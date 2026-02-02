export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6" role="status" aria-label="Chargement…">
      <div className="mb-6">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="flex gap-8">
        {/* Sidebar skeleton */}
        <aside className="hidden w-60 shrink-0 lg:block" aria-hidden="true">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </aside>

        {/* Grid skeleton */}
        <div className="min-w-0 flex-1" aria-hidden="true">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl border">
                <div className="aspect-square animate-pulse bg-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
