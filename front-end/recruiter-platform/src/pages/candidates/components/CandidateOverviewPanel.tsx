import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import type { CandidateDetail } from "@/api/schemas/candidates.schema";
import type { DocumentViewerTarget } from "@/components/common/DocumentViewerPanel";
import { ResponsiveSidePanel } from "@/components/common/ResponsiveSidePanel";
import { candidateDisplayName } from "@/lib/candidateFormat";
import { CandidateOverview } from "./CandidateOverview";

interface CandidateOverviewPanelProps {
  open: boolean;
  candidate?: CandidateDetail;
  isLoading: boolean;
  onClose: () => void;
  onViewDocument: (target: DocumentViewerTarget) => void;
}

/** Left inline panel on the candidate detail page. */
export function CandidateOverviewPanel({
  open,
  candidate,
  isLoading,
  onClose,
  onViewDocument,
}: CandidateOverviewPanelProps) {
  const { t } = useTranslation();

  return (
    <ResponsiveSidePanel
      open={open}
      onClose={onClose}
      title={
        candidate
          ? candidateDisplayName(candidate)
          : t("candidate.overview.title")
      }
      description={candidate?.email ?? t("candidate.overview.loading")}
      closeLabel={t("common.close")}
      side="left"
      widthClassName="w-[24rem]"
      bodyClassName="space-y-6"
    >
      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="animate-spin" />
        </div>
      ) : !candidate ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-medium">
            {t("candidate.overview.loadFailedTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("candidate.overview.loadFailed")}
          </p>
        </div>
      ) : (
        <CandidateOverview
          candidate={candidate}
          onViewDocument={(fileId, fileName) =>
            onViewDocument({ fileId, fileName: fileName ?? undefined })
          }
        />
      )}
    </ResponsiveSidePanel>
  );
}
