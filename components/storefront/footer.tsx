import { SITE_NAME } from "@/lib/utils/constants";

export function Footer() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} {SITE_NAME}. Tous droits réservés.
      </div>
    </footer>
  );
}
