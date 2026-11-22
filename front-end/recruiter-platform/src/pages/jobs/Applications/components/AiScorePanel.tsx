import { useTranslation } from "react-i18next";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleSlashIcon,
  Loader2,
  SparklesIcon,
} from "lucide-react";

import { Badge } from "@ui/badge";

import { cn } from "@/lib/utils";
import type { AiScoreAssessment } from "@/types/application.types";

interface AiScorePanelProps {
  assessment?: AiScoreAssessment | null;
}

/**
 * The AI's assessment of an application.
 *
 * What it shows depends on what the AI managed to do: a full assessment, a
 * number without a narrative (no language model was available), a run that is
 * still going, or a run that failed.
 */
export function AiScorePanel({ assessment }: AiScorePanelProps) {
  const { t } = useTranslation();

  if (!assessment) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("job.applications.drawer.ai.none")}
      </p>
    );
  }

  if (assessment.status === "PENDING") {
    return (
      <div className="flex items-start gap-3 rounded-md border p-3">
        <Loader2 className="mt-0.5 size-4 animate-spin text-muted-foreground" />
        <div className="space-y-1">
          <Badge variant="outline">
            {t("job.applications.drawer.ai.pending")}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {t("job.applications.drawer.ai.pendingDescription")}
          </p>
        </div>
      </div>
    );
  }

  if (assessment.status === "FAILED") {
    if (assessment.needsReview) {
      return (
        <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
          <AlertTriangleIcon className="mt-0.5 size-4 text-amber-600 dark:text-amber-500" />
          <div className="space-y-1">
            <Badge variant="outline">
              {t("job.applications.drawer.ai.needsReview")}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {assessment.failureMessage ||
                t("job.applications.drawer.ai.needsReviewDescription")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("job.applications.drawer.ai.needsReviewNextStep")}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
        <AlertTriangleIcon className="mt-0.5 size-4 text-destructive" />
        <div className="space-y-1">
          <Badge variant="destructive">
            {t("job.applications.drawer.ai.failed")}
          </Badge>
          <p className="text-sm text-muted-foreground">
            {assessment.failureMessage ||
              assessment.failureReason ||
              t("job.applications.drawer.ai.failedDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-3xl font-semibold tabular-nums",
            assessment.score !== null && assessment.score !== undefined
              ? scoreTone(assessment.score)
              : "text-muted-foreground",
          )}
        >
          {assessment.score !== null && assessment.score !== undefined
            ? Math.round(assessment.score)
            : "—"}
        </span>
        <div className="space-y-0.5">
          <Badge variant={assessment.status === "SCORED" ? "default" : "secondary"}>
            {assessment.status === "SCORED"
              ? t("job.applications.drawer.ai.scored")
              : t("job.applications.drawer.ai.scoreOnly")}
          </Badge>
          {assessment.weightsVersion ? (
            <p className="text-xs text-muted-foreground">
              {t("job.applications.drawer.ai.weights", {
                version: assessment.weightsVersion,
              })}
            </p>
          ) : null}
        </div>
      </div>

      {assessment.knockoutReason ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <CircleSlashIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>{assessment.knockoutReason}</span>
        </div>
      ) : null}

      {assessment.aiSummary ? (
        <section className="space-y-1">
          <h4 className="text-sm font-medium">
            {t("job.applications.drawer.ai.summary")}
          </h4>
          <p className="text-sm text-muted-foreground">{assessment.aiSummary}</p>
        </section>
      ) : null}

      {assessment.strengths?.length ? (
        <List
          title={t("job.applications.drawer.ai.strengths")}
          items={assessment.strengths}
          icon={<CheckCircle2Icon className="size-3.5 text-emerald-600" />}
        />
      ) : null}

      {assessment.risks?.length ? (
        <List
          title={t("job.applications.drawer.ai.risks")}
          items={assessment.risks}
          icon={<AlertTriangleIcon className="size-3.5 text-amber-600" />}
        />
      ) : null}

      {assessment.matchingSkills?.length ||
      assessment.missingSkills?.length ? (
        <section className="space-y-2">
          <h4 className="text-sm font-medium">
            {t("job.applications.drawer.ai.skills")}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {assessment.matchingSkills?.map((skill) => (
              <Badge key={`matching-${skill}`} variant="secondary">
                {skill}
              </Badge>
            ))}
            {assessment.missingSkills?.map((skill) => (
              <Badge key={`missing-${skill}`} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {assessment.interviewQuestions?.length ? (
        <List
          title={t("job.applications.drawer.ai.interviewQuestions")}
          items={assessment.interviewQuestions}
          icon={<SparklesIcon className="size-3.5 text-muted-foreground" />}
        />
      ) : null}
    </div>
  );
}

function List({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
}) {
  return (
    <section className="space-y-1">
      <h4 className="text-sm font-medium">{title}</h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The colour of a score: the higher it is, the better it looks. */
function scoreTone(score: number): string {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-500";
  if (score >= 40) return "text-amber-600 dark:text-amber-500";
  return "text-destructive";
}
