import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Contactez-nous</h1>
      <p className="mb-8 text-muted-foreground">
        Une question, une suggestion ou un problème ? Notre équipe est là pour
        vous aider.
      </p>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Contact info */}
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Nos coordonnées</h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Adresse</p>
                <p>Abidjan, Côte d&apos;Ivoire</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Email</p>
                <a
                  href="mailto:contact@netereka.ci"
                  className="text-primary hover:underline"
                >
                  contact@netereka.ci
                </a>
              </div>
              <div>
                <p className="font-medium text-foreground">WhatsApp</p>
                <p>Disponible 7j/7</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Horaires</h2>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Lundi - Vendredi : 08h00 - 18h00</p>
              <p>Samedi : 09h00 - 15h00</p>
              <p>Dimanche : Fermé</p>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Service client</h2>
            <p className="text-sm text-muted-foreground">
              Pour le suivi de vos commandes, connectez-vous à votre{" "}
              <Link href="/account" className="text-primary hover:underline">
                espace client
              </Link>
              . Vous y trouverez l&apos;historique et le statut de vos commandes.
            </p>
          </div>
        </div>

        {/* Contact methods */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Écrivez-nous</h2>
          <p className="text-sm text-muted-foreground">
            Choisissez le moyen qui vous convient le mieux pour nous contacter :
          </p>

          <a
            href="mailto:contact@netereka.ci"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Envoyer un email
          </a>

          <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
            <p>
              Vous pouvez aussi nous écrire directement à{" "}
              <a
                href="mailto:contact@netereka.ci"
                className="font-medium text-primary hover:underline"
              >
                contact@netereka.ci
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
