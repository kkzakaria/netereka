"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileDownloadIcon } from "@hugeicons/core-free-icons";
import { exportOrdersCSV } from "@/actions/admin/orders";

export function OrderExportButton() {
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  function handleExport() {
    startTransition(async () => {
      const filters = {
        search: searchParams.get("search") || undefined,
        status: searchParams.get("status") || undefined,
        commune: searchParams.get("commune") || undefined,
        dateFrom: searchParams.get("dateFrom") || undefined,
        dateTo: searchParams.get("dateTo") || undefined,
      };

      const result = await exportOrdersCSV(filters);

      if (!result.success || !result.csv) {
        toast.error(result.error || "Erreur lors de l'export");
        return;
      }

      // Create and download the file
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `commandes_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Export téléchargé");
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isPending}
    >
      <HugeiconsIcon icon={FileDownloadIcon} size={16} className="mr-1.5" />
      {isPending ? "Export..." : "Exporter CSV"}
    </Button>
  );
}
