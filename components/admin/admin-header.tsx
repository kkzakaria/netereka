"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  title: string;
  className?: string;
}

export function AdminHeader({ title, className }: AdminHeaderProps) {
  return (
    <header className={cn("flex items-center gap-4", className)}>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <HugeiconsIcon icon={Menu01Icon} size={20} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Menu de navigation</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>
      <h1 className="text-2xl font-bold">{title}</h1>
    </header>
  );
}
