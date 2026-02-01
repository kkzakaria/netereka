export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-64 border-r bg-sidebar lg:block">
        {/* Admin sidebar - to be implemented */}
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
