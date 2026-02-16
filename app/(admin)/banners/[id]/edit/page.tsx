import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BannerForm } from "@/components/admin/banner-form";
import { getBannerById } from "@/lib/db/admin/banners";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBannerPage({ params }: Props) {
  const { id } = await params;
  const banner = await getBannerById(Number(id));

  if (!banner) notFound();

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
            <h1 className="truncate text-lg font-bold sm:text-2xl">
              {banner.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Modifier la bannière
            </p>
          </div>
        </header>
      </AdminPageHeader>
      <BannerForm banner={banner} />
    </div>
  );
}
