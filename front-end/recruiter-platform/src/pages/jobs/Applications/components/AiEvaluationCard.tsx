import { useTranslation } from "react-i18next";
import { SparklesIcon } from "lucide-react";

import { Badge } from "@ui/badge";

/** Placeholder for the AI ranking feature planned for a later phase. */
export function AiEvaluationCard() {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-3 rounded-md border border-dashed p-3">
      <SparklesIcon className="mt-0.5 size-4 text-muted-foreground" />
      <div className="space-y-1">
        <Badge variant="outline">
          {t("job.applications.drawer.ai.pending")}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {t("job.applications.drawer.ai.description")}
        </p>
      </div>
    </div>
  );
}
