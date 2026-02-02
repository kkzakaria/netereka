"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

export function AdminHeader({ title }: { title: string }) {
  return (
    <header className="mb-6 flex items-center gap-4">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <HugeiconsIcon icon={Menu01Icon} size={20} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>
      <h1 className="text-2xl font-bold">{title}</h1>
    </header>
  );
}
