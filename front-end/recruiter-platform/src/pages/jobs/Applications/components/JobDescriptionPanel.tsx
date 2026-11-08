import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { Badge } from "@ui/badge";

import type { JobDetail } from "@/api/schemas/jobs.schema";
import { formatCompensation, formatIsoDate } from "@/lib/jobFormat";
import { formatEnumToStartCase } from "@/lib/utils";
import { ResponsiveSidePanel } from "./ResponsiveSidePanel";

interface JobDescriptionPanelProps {
  open: boolean;
  job?: JobDetail;
  isLoading: boolean;
  onClose: () => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end">{value}</span>
    </div>
  );
}

function TagList({ values }: { values?: string[] }) {
  if (!values?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <Badge key={value} variant="secondary">
          {value}
        </Badge>
      ))}
    </div>
  );
}

/**
 * Job-description pane shown beside the candidate list on desktop and as a
 * full-width sheet on mobile.
 */
export function JobDescriptionPanel({
  open,
  job,
  isLoading,
  onClose,
}: JobDescriptionPanelProps) {
  const { t } = useTranslation();
  const notProvided = t("jobForm.review.notProvided");

  return (
    <ResponsiveSidePanel
      open={open}
      onClose={onClose}
      side="left"
      title={t("job.applications.jobDescription.title")}
      closeLabel={t("job.applications.hideJobDescription")}
      widthClassName="w-[22rem]"
    >
      <div className="space-y-5">
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : !job ? (
          <p className="text-sm text-muted-foreground">
            {t("job.applications.jobDescription.loadFailed")}
          </p>
        ) : (
          <>
            <Section title={t("job.applications.jobDescription.overview")}>
              <div className="space-y-1">
                <Field
                  label={t("job.detail.fields.location")}
                  value={job.location || notProvided}
                />
                <Field
                  label={t("job.detail.fields.employmentType")}
                  value={formatEnumToStartCase(job.employmentType)}
                />
                <Field
                  label={t("job.detail.fields.workMode")}
                  value={
                    job.workMode.length
                      ? job.workMode.map(formatEnumToStartCase).join(", ")
                      : notProvided
                  }
                />
                <Field
                  label={t("job.detail.fields.yearsOfExperience")}
                  value={job.yearsOfExperience || notProvided}
                />
                <Field
                  label={t("job.detail.fields.lastApplicationDate")}
                  value={formatIsoDate(job.lastApplicationDate) || notProvided}
                />
              </div>
            </Section>

            <Section title={t("job.detail.fields.description")}>
              <p className="whitespace-pre-line text-sm">
                {job.description || notProvided}
              </p>
            </Section>

            <Section title={t("job.detail.fields.responsibilities")}>
              <p className="whitespace-pre-line text-sm">
                {job.responsibilities || notProvided}
              </p>
            </Section>

            <Section title={t("job.detail.fields.skills")}>
              {job.skills.length ? (
                <TagList values={job.skills} />
              ) : (
                <p className="text-sm text-muted-foreground">{notProvided}</p>
              )}
            </Section>

            <Section title={t("job.applications.jobDescription.compensation")}>
              <div className="space-y-1">
                <Field
                  label={t("job.detail.fields.compensation")}
                  value={formatCompensation(job.compensation) || notProvided}
                />
              </div>
              {job.benefits?.length ? (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs text-muted-foreground">
                    {t("job.detail.fields.benefits")}
                  </p>
                  <TagList values={job.benefits} />
                </div>
              ) : null}
            </Section>
          </>
        )}
      </div>
    </ResponsiveSidePanel>
  );
}
