import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";
import { CartDrawer } from "@/components/storefront/cart-drawer";

export const dynamic = "force-dynamic";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100dvh-8rem)]">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  );
}
