export default function NoGuardAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      {children}
    </div>
  );
}
