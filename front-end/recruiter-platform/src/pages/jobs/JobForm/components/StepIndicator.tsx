import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { STEP_KEYS } from "../constants";

interface StepIndicatorProps {
  currentStep: number;
  onSelect: (index: number) => void;
}

/** Clickable wizard progress indicator. Future steps stay disabled. */
export function StepIndicator({ currentStep, onSelect }: StepIndicatorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STEP_KEYS.map((key, index) => {
        const isActive = index === currentStep;
        const isDone = index < currentStep;
        return (
          <button
            key={key}
            type="button"
            disabled={index > currentStep}
            onClick={() => onSelect(index)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : isDone
                  ? "border-primary/40 text-foreground"
                  : "border-border text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-xs",
                isActive || isDone
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            {t(`jobForm.steps.${key}`)}
          </button>
        );
      })}
    </div>
  );
}
