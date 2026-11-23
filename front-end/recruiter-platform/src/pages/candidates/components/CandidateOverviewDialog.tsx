import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon, Loader2, XIcon } from "lucide-react";

import { Button } from "@ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ui/sheet";

import { useGetCandidate } from "@/api/hooks/useCandidates";
import type { DocumentViewerTarget } from "@/components/common/DocumentViewerPanel";
import { useIsDesktopPanel } from "@/hooks/useIsDesktopPanel";
import { CandidateOverview } from "./CandidateOverview";

interface CandidateOverviewDialogProps {
  candidateId: string | null;
  onClose: () => void;
  /** Preview is only wired on the detail page; the popup offers download. */
  onViewDocument?: (target: DocumentViewerTarget) => void;
}

/**
 * Overview-only popup opened from the list's eye action. A scrollable centered
 * dialog on desktop and a full-screen sheet below 861px. The applications
 * table is never rendered here; the footer navigates to the detail page.
 */
export function CandidateOverviewDialog({
  candidateId,
  onClose,
  onViewDocument,
}: CandidateOverviewDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDesktop = useIsDesktopPanel();
  const { data, isLoading, isError } = useGetCandidate(candidateId);
  const candidate = data?.data;

  const fullName = [candidate?.firstName, candidate?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const title = fullName || t("candidate.dialog.overviewTitle");
  const description = candidate?.email ?? t("candidate.overview.loading");

  const footer = (
    <Button
      type="button"
      onClick={() => {
        if (!candidateId) return;
        onClose();
        navigate(`/candidates/${candidateId}`);
      }}
      disabled={!candidateId}
    >
      {t("candidate.dialog.viewFullProfile")}
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  );

  const body = isLoading ? (
    <div className="flex min-h-40 items-center justify-center">
      <Loader2 className="animate-spin" />
    </div>
  ) : isError || !candidate ? (
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
      onViewDocument={
        onViewDocument
          ? (fileId, fileName) =>
              onViewDocument({ fileId, fileName: fileName ?? undefined })
          : undefined
      }
    />
  );

  if (!isDesktop) {
    return (
      <Sheet
        open={Boolean(candidateId)}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full! gap-0 p-0 sm:max-w-none!"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b p-4">
            <SheetHeader className="min-w-0 p-0">
              <SheetTitle className="truncate">{title}</SheetTitle>
              <SheetDescription className="truncate">
                {description}
              </SheetDescription>
            </SheetHeader>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              <XIcon />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{body}</div>
          <div className="flex shrink-0 justify-end border-t p-4">
            {footer}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog
      open={Boolean(candidateId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[85dvh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b p-4">
          <DialogHeader className="min-w-0">
            <DialogTitle className="truncate">{title}</DialogTitle>
            <DialogDescription className="truncate">
              {description}
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <XIcon />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{body}</div>
        <div className="flex shrink-0 justify-end border-t bg-muted/50 p-4">
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  );
}
