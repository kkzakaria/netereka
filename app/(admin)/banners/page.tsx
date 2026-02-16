import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { BannerTable } from "@/components/admin/banner-table";
import { getAllBanners } from "@/lib/db/admin/banners";

export default async function BannersPage() {
  const banners = await getAllBanners();

  const bannerData = banners.map((b) => ({
    id: b.id,
    title: b.title,
    image_url: b.image_url,
    display_order: b.display_order,
    is_active: b.is_active,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
  }));

  return (
    <div>
      <AdminPageHeader className="space-y-4">
        <AdminHeader title="Bannières" />
        <div className="hidden items-center justify-between lg:flex">
          <p className="text-sm text-muted-foreground">
            {banners.length} bannière(s)
          </p>
          <Button asChild>
            <Link href="/banners/new">Nouvelle bannière</Link>
          </Button>
        </div>
        {/* Mobile: just show the button */}
        <div className="flex items-center justify-between lg:hidden">
          <p className="text-sm text-muted-foreground">
            {banners.length} bannière(s)
          </p>
          <Button asChild>
            <Link href="/banners/new">Nouvelle bannière</Link>
          </Button>
        </div>
      </AdminPageHeader>

      <BannerTable banners={bannerData} />
    </div>
  );
}
