import { SITE_NAME } from "@/lib/utils/constants";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-32 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        {SITE_NAME}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Votre boutique électronique en Côte d&apos;Ivoire
      </p>
      <div className="mt-8 inline-flex items-center rounded-full border px-4 py-2 text-sm text-muted-foreground">
        Bientôt disponible
      </div>
    </div>
  );
}
