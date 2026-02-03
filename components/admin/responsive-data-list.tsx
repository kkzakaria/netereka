"use client";

import type { ReactNode } from "react";
import { useViewMode } from "./view-context";

interface ResponsiveDataListProps<T> {
  data: T[];
  tableView: ReactNode;
  renderCard: (item: T, index: number) => ReactNode;
  emptyMessage?: string;
}

export function ResponsiveDataList<T extends { id: string }>({
  data,
  tableView,
  renderCard,
  emptyMessage = "Aucun élément",
}: ResponsiveDataListProps<T>) {
  const { effectiveMode } = useViewMode();

  if (data.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  if (effectiveMode === "table") {
    return <>{tableView}</>;
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((item, index) => (
        <div key={item.id}>{renderCard(item, index)}</div>
      ))}
    </div>
  );
}
