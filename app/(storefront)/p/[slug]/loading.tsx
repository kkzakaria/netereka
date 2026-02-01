export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 h-4 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-xl bg-muted" />
        <div className="space-y-4">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
