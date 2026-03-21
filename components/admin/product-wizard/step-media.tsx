// components/admin/product-wizard/step-media.tsx
import dynamic from "next/dynamic";
import type { ProductDetail } from "@/lib/db/types";

const ImageManager = dynamic(() =>
  import("@/components/admin/image-manager").then((m) => m.ImageManager),
);
const VariantList = dynamic(() =>
  import("@/components/admin/variant-list").then((m) => m.VariantList),
);

interface StepMediaProps {
  product: ProductDetail;
  formRef: React.RefObject<HTMLFormElement | null>;
}

export function StepMedia({ product, formRef }: StepMediaProps) {
  return (
    <form ref={formRef} className="space-y-8">
      <input type="hidden" name="_step" value="3" />

      {/* Images */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Images</h3>
          <p className="text-xs text-muted-foreground">
            Ajoutez au moins une photo avant de publier.
          </p>
        </div>

        {/* Amber hint if no images yet */}
        {product.images.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            📸 Aucune image pour l&apos;instant. Au moins une image est
            recommandée avant la publication.
          </div>
        )}

        <ImageManager productId={product.id} images={product.images} />
      </div>

      {/* Variantes */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Variantes</h3>
          <p className="text-xs text-muted-foreground">
            Ajoutez des variantes si ce produit existe en plusieurs versions
            (couleur, stockage…).
          </p>
        </div>
        <VariantList productId={product.id} variants={product.variants} />
      </div>
    </form>
  );
}
