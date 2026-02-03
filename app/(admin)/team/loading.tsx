import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-32" />
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
