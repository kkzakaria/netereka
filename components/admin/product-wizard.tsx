// components/admin/product-wizard.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { saveDraftStep, updateProduct } from "@/actions/admin/products";
import { WizardStepper } from "./product-wizard/wizard-stepper";
import { StepIdentity } from "./product-wizard/step-identity";
import { StepAttributes } from "./product-wizard/step-attributes";
import { StepPricing } from "./product-wizard/step-pricing";
import { StepMedia } from "./product-wizard/step-media";
import { StepFinalization } from "./product-wizard/step-finalization";
import type { ProductDetail } from "@/lib/db/types";
import type { CategoryOption } from "./category-cascading-select";

const STEPS = [
  { label: "Identité", subtitle: "Nom · Catégorie" },
  { label: "Caractéristiques", subtitle: "Écran · Processeur…" },
  { label: "Prix & Stock", subtitle: "Prix · Quantité" },
  { label: "Médias", subtitle: "Images" },
  { label: "Finalisation", subtitle: "Description · SEO" },
];

export function getInitialStep(product: ProductDetail): number {
  if (!product.name) return 0;
  if (!product.category_id) return 0;
  if (product.attributes.length === 0) return 1;
  if (product.base_price === 0) return 2;
  if (!product.images.some((img) => img.is_primary === 1)) return 3;
  return 4;
}

interface ProductWizardProps {
  product: ProductDetail;
  // CategoryOption from components/admin/category-cascading-select (4 fields: id, name, depth, parent_id)
  categories: CategoryOption[];
}

export function ProductWizard({ product, categories }: ProductWizardProps) {
  const [currentStep, setCurrentStep] = useState(getInitialStep(product));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  function handleNext() {
    if (!formRef.current) {
      console.error("[ProductWizard] formRef is null — form component did not mount");
      toast.error("Erreur inattendue. Veuillez actualiser la page.");
      return;
    }
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      try {
        const result = await saveDraftStep(product.id, formData);
        if (result.success) {
          setCurrentStep((prev) => prev + 1);
          router.refresh();
        } else {
          toast.error(result.error ?? "Une erreur est survenue");
        }
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
        console.error("[ProductWizard] handleNext failed:", error);
        toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      }
    });
  }

  function handlePublish() {
    if (!formRef.current) {
      console.error("[ProductWizard] formRef is null — form component did not mount");
      toast.error("Erreur inattendue. Veuillez actualiser la page.");
      return;
    }
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      try {
        const result = await updateProduct(product.id, formData);
        if (result.success) {
          toast.success("Produit publié");
          router.push("/products");
        } else {
          toast.error(result.error ?? "Une erreur est survenue");
        }
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
        console.error("[ProductWizard] handlePublish failed:", error);
        toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      }
    });
  }

  function handleSaveDraft() {
    if (!formRef.current) {
      console.error("[ProductWizard] formRef is null — form component did not mount");
      toast.error("Erreur inattendue. Veuillez actualiser la page.");
      return;
    }
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      try {
        const result = await saveDraftStep(product.id, formData);
        if (result.success) {
          toast.success("Brouillon enregistré");
          router.push("/products");
        } else {
          toast.error(result.error ?? "Une erreur est survenue");
        }
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) throw error;
        console.error("[ProductWizard] handleSaveDraft failed:", error);
        toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      }
    });
  }

  function handleNavigate(targetStep: number) {
    if (!formRef.current) {
      setCurrentStep(targetStep);
      return;
    }
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      try {
        const result = await saveDraftStep(product.id, formData);
        if (!result.success) {
          toast.warning("Vos modifications n'ont pas pu être enregistrées.");
        }
      } catch (error) {
        console.error("[ProductWizard] handleNavigate save failed:", error);
        toast.warning("Vos modifications n'ont pas pu être enregistrées.");
      }
      setCurrentStep(targetStep);
    });
  }

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="flex flex-col">
      {/* Integrated header: back button + description + stepper.
         Sticky so it stays visible while main (the admin layout scroll container) scrolls. */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/products" aria-label="Retour aux produits">
              <HugeiconsIcon icon={ArrowLeft02Icon} size={20} />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">Créer un produit</p>
        </div>
        <WizardStepper
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={handleNavigate}
        />
      </div>

      {/* Step content — flows inside main's scroll */}
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        {currentStep === 0 && (
          <StepIdentity
            product={product}
            categories={categories}
            formRef={formRef}
            isPending={isPending}
          />
        )}
        {currentStep === 1 && (
          <StepAttributes
            product={product}
            formRef={formRef}
            isPending={isPending}
          />
        )}
        {currentStep === 2 && (
          <StepPricing
            product={product}
            formRef={formRef}
            isPending={isPending}
          />
        )}
        {currentStep === 3 && (
          <StepMedia product={product} formRef={formRef} />
        )}
        {currentStep === 4 && (
          <StepFinalization
            product={product}
            formRef={formRef}
            isPending={isPending}
          />
        )}

        {/* Navigation footer */}
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <p className="text-xs text-muted-foreground">
            {isPending ? "Enregistrement…" : "Brouillon sauvegardé à chaque étape"}
          </p>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleNavigate(currentStep - 1)}
              >
                ← Précédent
              </Button>
            )}
            {isLastStep ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={handleSaveDraft}
                >
                  {isPending ? "…" : "Enregistrer comme brouillon"}
                </Button>
                <Button
                  type="button"
                  disabled={isPending}
                  onClick={handlePublish}
                >
                  {isPending ? "…" : "Publier le produit"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                disabled={isPending}
                onClick={handleNext}
              >
                {isPending ? "Enregistrement…" : "Suivant →"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
