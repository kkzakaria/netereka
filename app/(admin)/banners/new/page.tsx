import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BannerForm } from "@/components/admin/banner-form";

export default function NewBannerPage() {
  return (
    <div>
      <AdminPageHeader>
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-11 w-11 shrink-0"
            aria-label="Retour aux bannières"
          >
            <Link href="/banners">
              <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold sm:text-2xl">
              Nouvelle bannière
            </h1>
            <p className="text-sm text-muted-foreground">
              Créer une bannière
            </p>
          </div>
        </header>
      </AdminPageHeader>
      <BannerForm />
    </div>
  );
}
