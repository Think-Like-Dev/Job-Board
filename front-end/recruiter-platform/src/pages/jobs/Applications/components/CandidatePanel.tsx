import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  GlobeIcon,
  LinkIcon,
  Loader2,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";

import { useGetJobApplication } from "@/api/hooks/useJobApplications";
import type {
  ApplicationProfileSnapshot,
  JobApplicationDetail,
} from "@/types/application.types";
import { ActivityTimeline } from "./ActivityTimeline";
import { AiEvaluationCard } from "./AiEvaluationCard";
import { CandidateDocuments } from "./CandidateDocuments";
import { CandidateProfileSnapshot } from "./CandidateProfileSnapshot";
import type { DocumentViewerTarget } from "@/components/common/DocumentViewerPanel";
import { ResponsiveSidePanel } from "@/components/common/ResponsiveSidePanel";

interface CandidatePanelProps {
  applicationId: string | null;
  onClose: () => void;
  onViewDocument: (target: DocumentViewerTarget) => void;
  /** Overrides the candidate name/email header used on the job applications page. */
  title?: string;
  description?: string;
  side?: "left" | "right";
}

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function profileLocation(
  profile: ApplicationProfileSnapshot,
): string | undefined {
  const current = profile.currentLocation?.trim();
  if (current) return current;

  const composed = [profile.city, profile.state, profile.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  if (composed) return composed;

  return profile.address?.trim() || undefined;
}

function CandidateContact({
  application,
}: {
  application: JobApplicationDetail;
}) {
  const { t } = useTranslation();
  const location = profileLocation(application.profile);
  const linkedin =
    application.candidate.linkedinUrl ?? application.profile.linkedinUrl;
  const portfolio =
    application.candidate.portfolioUrl ?? application.profile.portfolioUrl;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <MailIcon className="size-3.5" />
        {application.candidateEmail}
      </span>
      {application.candidatePhone ? (
        <span className="inline-flex items-center gap-1.5">
          <PhoneIcon className="size-3.5" />
          {application.candidatePhone}
        </span>
      ) : null}
      {location ? (
        <span className="inline-flex items-center gap-1.5">
          <MapPinIcon className="size-3.5" />
          {location}
        </span>
      ) : null}
      {linkedin ? (
        <a
          href={linkedin}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-primary hover:underline"
        >
          <LinkIcon className="size-3.5" />
          {t("job.applications.drawer.profile.linkedin")}
        </a>
      ) : null}
      {portfolio ? (
        <a
          href={portfolio}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-primary hover:underline"
        >
          <GlobeIcon className="size-3.5" />
          {t("job.applications.drawer.profile.portfolio")}
        </a>
      ) : null}
    </div>
  );
}

/**
 * Candidate detail pane. Inline on desktop and a full-width sheet on mobile,
 * opened from a table row.
 */
export function CandidatePanel({
  applicationId,
  onClose,
  onViewDocument,
  title,
  description,
  side = "right",
}: CandidatePanelProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetJobApplication(applicationId);
  const application = data?.data;

  return (
    <ResponsiveSidePanel
      open={Boolean(applicationId)}
      onClose={onClose}
      title={
        title ?? application?.candidateName ?? t("job.applications.drawer.title")
      }
      description={
        description ??
        application?.candidateEmail ??
        t("job.applications.drawer.loading")
      }
      closeLabel={t("common.close")}
      side={side}
      widthClassName="w-[26rem]"
      bodyClassName="space-y-6"
    >
      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="animate-spin" />
        </div>
      ) : isError || !application ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-medium">
            {t("job.applications.drawer.loadFailedTitle")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("job.applications.drawer.loadFailed")}
          </p>
        </div>
      ) : (
        <>
          <CandidateContact application={application} />

          <PanelSection
            title={t("job.applications.drawer.sections.documents")}
          >
            <CandidateDocuments
              resumeFileId={application.resumeFileId}
              resumeFileName={application.resumeFileName}
              coverLetterFileId={application.coverLetterFileId}
              coverLetterFileName={application.coverLetterFileName}
              onViewDocument={onViewDocument}
            />
          </PanelSection>

          <PanelSection title={t("job.applications.drawer.sections.profile")}>
            <CandidateProfileSnapshot profile={application.profile} />
          </PanelSection>

          <PanelSection title={t("job.applications.drawer.sections.ai")}>
            <AiEvaluationCard />
          </PanelSection>

          <PanelSection title={t("job.applications.drawer.sections.timeline")}>
            <ActivityTimeline application={application} />
          </PanelSection>
        </>
      )}
    </ResponsiveSidePanel>
  );
}
