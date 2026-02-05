"use client";

import type { ReactNode } from "react";
import { useViewMode } from "./view-context";

interface ResponsiveDataListProps<T> {
  data: T[];
  /** @deprecated Use renderTable instead to avoid eager rendering of the inactive view */
  tableView?: ReactNode;
  renderTable?: (data: T[]) => ReactNode;
  renderCard: (item: T, index: number) => ReactNode;
  emptyMessage?: string;
}

export function ResponsiveDataList<T extends { id: string }>({
  data,
  tableView,
  renderTable,
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
    return <>{renderTable ? renderTable(data) : tableView}</>;
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((item, index) => (
        <div key={item.id}>{renderCard(item, index)}</div>
      ))}
    </div>
  );
}
