import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, PanelLeftIcon } from "lucide-react";

import { Badge } from "@ui/badge";
import { Button } from "@ui/button";

import type { CandidateDetail } from "@/api/schemas/candidates.schema";
import { candidateDisplayName } from "@/lib/candidateFormat";

interface CandidateDetailHeaderProps {
  candidate?: CandidateDetail;
  isLoading: boolean;
  onBack: () => void;
  onToggleOverview: () => void;
}

/** Back navigation, identity and the overview-panel toggle. */
export function CandidateDetailHeader({
  candidate,
  isLoading,
  onBack,
  onToggleOverview,
}: CandidateDetailHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label={t("candidate.detail.back")}
          title={t("candidate.detail.back")}
        >
          <ArrowLeftIcon />
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold">
              {candidate
                ? candidateDisplayName(candidate)
                : isLoading
                  ? t("common.loading")
                  : t("candidate.detail.notFound")}
            </h1>
            {candidate?.createdBy ? (
              <Badge variant="secondary">
                {t("candidate.source.recruiter")}
              </Badge>
            ) : null}
          </div>
          {candidate ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="break-all">{candidate.email}</span>
              <Button
                type="button"
                variant="outline"
                onClick={onToggleOverview}
                disabled={!candidate}
              >
                <PanelLeftIcon data-icon="inline-start" />
                {t("common.toggleOverview")}
              </Button>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
