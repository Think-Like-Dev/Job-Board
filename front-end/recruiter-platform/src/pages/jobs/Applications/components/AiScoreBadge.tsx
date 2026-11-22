import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AiScoreSummary } from "@/types/application.types";

interface AiScoreBadgeProps {
  score?: AiScoreSummary | null;
}

/**
 * The AI score of an application.
 *
 * Four states, and the recruiter can tell them apart at a glance: a number
 * (green when it is high, amber in the middle, red when it is low), "being
 * calculated", "failed", and nothing at all when no score was asked for.
 */
export function AiScoreBadge({ score }: AiScoreBadgeProps) {
  const { t } = useTranslation();

  if (!score) {
    return (
      <span
        className="text-sm text-muted-foreground"
        title={t("job.applications.aiScore.none")}
      >
        —
      </span>
    );
  }

  if (score.status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        {t("job.applications.aiScore.scoring")}
      </span>
    );
  }

  if (score.status === "FAILED") {
    if (score.needsReview) {
      return (
        <span
          className="text-sm font-medium text-amber-600 dark:text-amber-500"
          title={t("job.applications.aiScore.needsReviewHint")}
        >
          {t("common.needsReview")}
        </span>
      );
    }
    return (
      <span className="text-sm text-destructive">
        {t("job.applications.aiScore.failed")}
      </span>
    );
  }

  if (score.score === null || score.score === undefined) {
    return (
      <span
        className="text-sm text-muted-foreground"
        title={t("job.applications.aiScore.none")}
      >
        —
      </span>
    );
  }

  return (
    <span className={cn("text-sm font-medium tabular-nums", scoreTone(score.score))}>
      {Math.round(score.score)}
    </span>
  );
}

/** The colour of a score: the higher it is, the better it looks. */
function scoreTone(score: number): string {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-500";
  if (score >= 40) return "text-amber-600 dark:text-amber-500";
  return "text-destructive";
}
