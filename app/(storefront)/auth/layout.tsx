import { requireGuest } from "@/lib/auth/guards";


export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGuest();
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-8">
      {children}
    </div>
  );
}
