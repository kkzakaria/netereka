import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/utils/constants";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contactez ${SITE_NAME} pour toute question sur vos commandes, produits ou livraisons. Service client disponible 7j/7 à Abidjan, Côte d'Ivoire.`,
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
