import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";

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
    </>
  );
}
