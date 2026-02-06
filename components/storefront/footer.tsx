import Link from "next/link";
import Image from "next/image";
import { SITE_NAME } from "@/lib/utils/constants";

const footerLinks = {
  boutique: {
    title: "Boutique",
    links: [
      { label: "Tous les produits", href: "/search" },
    ],
  },
  informations: {
    title: "Informations",
    links: [
      { label: "À propos", href: "/a-propos" },
      { label: "Livraison", href: "/livraison" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  legal: {
    title: "Légal",
    links: [
      { label: "Conditions générales de vente", href: "/conditions-generales" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt={SITE_NAME}
                width={120}
                height={43}
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Votre boutique électronique en Côte d&apos;Ivoire. Smartphones,
              ordinateurs, consoles et plus. Livraison rapide à Abidjan.
            </p>
          </div>

          {/* Link columns */}
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-sm font-semibold">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} {SITE_NAME}. Tous droits
            réservés. Paiement à la livraison uniquement.
          </p>
        </div>
      </div>
    </footer>
  );
}
