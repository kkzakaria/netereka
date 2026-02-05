"use client";

import { useState } from "react";

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // For now, display a confirmation message.
    // A server action for email sending can be added when Resend/Brevo is configured.
    setSubmitted(true);
  }

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
                <p>contact@netereka.com</p>
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
              <a href="/account" className="text-primary hover:underline">
                espace client
              </a>
              . Vous y trouverez l&apos;historique et le statut de vos commandes.
            </p>
          </div>
        </div>

        {/* Contact form */}
        <div>
          {submitted ? (
            <div className="rounded-lg border bg-muted/30 p-6 text-center">
              <h2 className="text-lg font-semibold text-foreground">
                Message envoyé
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Merci pour votre message. Notre équipe vous répondra dans les
                plus brefs délais.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setFormState({ name: "", email: "", subject: "", message: "" });
                }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Nom complet
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formState.name}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, name: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Votre nom"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formState.email}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, email: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Sujet
                </label>
                <select
                  id="subject"
                  required
                  value={formState.subject}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, subject: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Sélectionnez un sujet</option>
                  <option value="commande">Question sur une commande</option>
                  <option value="produit">Question sur un produit</option>
                  <option value="livraison">Livraison</option>
                  <option value="retour">Retour / Échange</option>
                  <option value="compte">Mon compte</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={formState.message}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, message: e.target.value }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Décrivez votre demande..."
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Envoyer le message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
