import { CartSync } from "@/components/storefront/cart-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CartSync />
      {children}
    </>
  );
}
