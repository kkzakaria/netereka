import { JsonLd } from "./json-ld";
import { SITE_URL } from "@/lib/utils/constants";

type BreadcrumbItem = {
  name: string;
  href?: string;
};

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href && { item: `${SITE_URL}${item.href}` }),
    })),
  };

  return <JsonLd data={schema} />;
}
