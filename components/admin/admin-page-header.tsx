import { cn } from "@/lib/utils";

export function AdminPageHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky -top-4 sm:-top-6 z-10 bg-background",
        "-mx-4 -mt-4 mb-4 px-4 pt-6 pb-4",
        "sm:-mx-6 sm:-mt-6 sm:mb-6 sm:px-6 sm:pt-9",
        className
      )}
    >
      {children}
    </div>
  );
}
