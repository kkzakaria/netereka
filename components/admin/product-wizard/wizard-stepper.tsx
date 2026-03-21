// components/admin/product-wizard/wizard-stepper.tsx
interface WizardStep {
  label: string;
  subtitle: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number; // 0-indexed
  onStepClick: (index: number) => void;
}

export function WizardStepper({
  steps,
  currentStep,
  onStepClick,
}: WizardStepperProps) {
  return (
    <div className="flex items-center border-b bg-muted/30 px-6 py-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={index} className="flex min-w-0 flex-1 items-center">
            {/* Step indicator */}
            <button
              type="button"
              onClick={() => isCompleted && onStepClick(index)}
              disabled={!isCompleted}
              className="flex shrink-0 items-center gap-2.5 disabled:cursor-default"
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                  isCompleted
                    ? "bg-[#183C78] text-white"
                    : isCurrent
                      ? "border-2 border-[#183C78] bg-white text-[#183C78]"
                      : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {index + 1}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span
                  className={[
                    "block text-xs font-semibold uppercase tracking-wide",
                    isCurrent ? "text-[#183C78]" : isCompleted ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {step.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {step.subtitle}
                </span>
              </span>
            </button>

            {/* Connector line (not after last step) */}
            {index < steps.length - 1 && (
              <div className="mx-3 h-0.5 flex-1 bg-border">
                <div
                  className="h-full bg-[#183C78] transition-all duration-300"
                  style={{ width: isCompleted ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
