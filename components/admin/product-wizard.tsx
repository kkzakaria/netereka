// components/admin/product-wizard.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveDraftStep, updateProduct } from "@/actions/admin/products";
import { WizardStepper } from "./product-wizard/wizard-stepper";
import { StepIdentity } from "./product-wizard/step-identity";
import { StepPricing } from "./product-wizard/step-pricing";
import { StepMedia } from "./product-wizard/step-media";
import { StepFinalization } from "./product-wizard/step-finalization";
import type { ProductDetail } from "@/lib/db/types";
import type { CategoryOption } from "./category-cascading-select";

const STEPS = [
  { label: "Identité", subtitle: "Nom · Marque · Catégorie" },
  { label: "Prix & Stock", subtitle: "Prix · Quantité" },
  { label: "Médias", subtitle: "Images · Variantes" },
  { label: "Finalisation", subtitle: "Description · SEO" },
];

export function getInitialStep(product: ProductDetail): number {
  if (!product.name) return 0;
  if (!product.category_id || product.base_price === 0) return 1;
  if (!product.images.some((img) => img.is_primary === 1)) return 2;
  return 3;
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
        await saveDraftStep(product.id, formData);
      } catch {
        // best-effort — navigate regardless
      }
      setCurrentStep(targetStep);
    });
  }

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="flex flex-col">
      {/* Stepper */}
      <WizardStepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={handleNavigate}
      />

      {/* Step content */}
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
          <StepPricing
            product={product}
            formRef={formRef}
            isPending={isPending}
          />
        )}
        {currentStep === 2 && (
          <StepMedia product={product} formRef={formRef} />
        )}
        {currentStep === 3 && (
          <StepFinalization
            product={product}
            formRef={formRef}
            isPending={isPending}
          />
        )}

        {/* Navigation footer */}
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <p className="text-xs text-muted-foreground">
            {isPending ? "Enregistrement…" : "Brouillon sauvegardé automatiquement"}
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
