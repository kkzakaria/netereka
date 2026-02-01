"use client";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-32 text-center">
      <h2 className="text-2xl font-bold">Une erreur est survenue</h2>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Réessayer
      </button>
    </div>
  );
}
