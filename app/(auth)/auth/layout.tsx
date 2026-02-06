import type { Metadata } from "next";
import { requireGuest } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGuest();
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      {children}
    </div>
  );
}
