import { useTranslation } from "react-i18next";
import { InfoIcon, PlusIcon } from "lucide-react";

import { Button } from "@ui/button";

/**
 * Step 5 — placeholder for the Google-Forms-style application questions builder.
 * The real builder is intentionally deferred to a later task.
 */
export function QuestionsStep() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted">
          <InfoIcon className="size-5 text-muted-foreground" />
        </span>
        <div className="space-y-1">
          <h2 className="text-base font-medium">
            {t("jobForm.questions.title")}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {t("jobForm.questions.description")}
          </p>
        </div>
        <Button type="button" variant="outline" disabled>
          <PlusIcon data-icon="inline-start" />
          {t("jobForm.questions.addQuestion")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t("jobForm.questions.comingSoon")}
        </p>
      </div>
    </div>
  );
}
