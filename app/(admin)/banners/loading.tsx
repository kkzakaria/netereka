import { Skeleton } from "@/components/ui/skeleton";

export default function BannersLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
