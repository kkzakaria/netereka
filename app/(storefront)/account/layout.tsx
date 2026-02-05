import { requireAuth } from "@/lib/auth/guards";
import { AccountNav } from "@/components/storefront/account-nav";

export const metadata = {
  title: "Mon compte | NETEREKA",
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold sm:text-2xl">Mon compte</h1>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <AccountNav />
        <div>{children}</div>
      </div>
    </div>
  );
}
