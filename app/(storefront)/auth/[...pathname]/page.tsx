import { AuthView } from "@daveyplate/better-auth-ui";

export default async function AuthPage({
  params,
}: {
  params: Promise<{ pathname: string[] }>;
}) {
  const { pathname } = await params;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <AuthView pathname={pathname.join("/")} />
      </div>
    </div>
  );
}
