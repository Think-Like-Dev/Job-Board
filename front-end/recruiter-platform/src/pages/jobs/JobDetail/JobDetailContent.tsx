import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@ui/badge";

import type { JobDetail } from "@/api/schemas/jobs.schema";
import { formatCompensation, formatIsoDate } from "@/lib/jobFormat";
import { formatEnumToStartCase } from "@/lib/utils";
import { JobStatus } from "@/types/job.types";

interface JobDetailContentProps {
  job: JobDetail;
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
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

function StatusBadge({ status }: { status: JobStatus }) {
  const variant =
    status === JobStatus.PUBLISHED
      ? "default"
      : status === JobStatus.DRAFT
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{formatEnumToStartCase(status)}</Badge>;
}

/**
 * Read-only job content rendered inside the detail popup. Sections flow into
 * two columns from tablet width upward and stack on mobile.
 */
export function JobDetailContent({ job }: JobDetailContentProps) {
  const { t } = useTranslation();
  const notProvided = t("jobForm.review.notProvided");
  const settings = job.applicationSettings;

  return (
    <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
      <DetailSection title={t("job.detail.sections.overview")}>
        <dl className="space-y-2">
          <DetailField label={t("job.detail.fields.status")}>
            <StatusBadge status={job.status} />
          </DetailField>
          <DetailField label={t("job.detail.fields.code")}>
            {job.code}
          </DetailField>
          <DetailField label={t("job.detail.fields.category")}>
            {job.category || notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.department")}>
            {job.department || notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.designation")}>
            {job.designation || notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.employmentType")}>
            {formatEnumToStartCase(job.employmentType)}
          </DetailField>
          <DetailField label={t("job.detail.fields.location")}>
            {job.location || notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.workMode")}>
            {job.workMode.length
              ? job.workMode.map(formatEnumToStartCase).join(", ")
              : notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.vacancies")}>
            {job.vacancies ?? notProvided}
          </DetailField>
        </dl>
      </DetailSection>

      <DetailSection title={t("job.detail.sections.description")}>
        <dl className="space-y-2">
          <DetailField label={t("job.detail.fields.description")}>
            <p className="whitespace-pre-line">
              {job.description || notProvided}
            </p>
          </DetailField>
          <DetailField label={t("job.detail.fields.responsibilities")}>
            <p className="whitespace-pre-line">
              {job.responsibilities || notProvided}
            </p>
          </DetailField>
          <DetailField label={t("job.detail.fields.yearsOfExperience")}>
            {job.yearsOfExperience || notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.skills")}>
            {job.skills.length ? <TagList values={job.skills} /> : notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.keywords")}>
            {job.keywords.length ? (
              <TagList values={job.keywords} />
            ) : (
              notProvided
            )}
          </DetailField>
        </dl>
      </DetailSection>

      <DetailSection title={t("job.detail.sections.compensation")}>
        <dl className="space-y-2">
          <DetailField label={t("job.detail.fields.compensation")}>
            {formatCompensation(job.compensation) || notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.benefits")}>
            {job.benefits?.length ? (
              <TagList values={job.benefits} />
            ) : (
              notProvided
            )}
          </DetailField>
          <DetailField label={t("job.detail.fields.workShiftTiming")}>
            {job.workShiftTiming.length ? (
              <TagList values={job.workShiftTiming} />
            ) : (
              notProvided
            )}
          </DetailField>
        </dl>
      </DetailSection>

      <DetailSection title={t("job.detail.sections.hiring")}>
        <dl className="space-y-2">
          <DetailField label={t("job.detail.fields.totalInterviewRounds")}>
            {job.totalInterviewRounds ?? notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.lastApplicationDate")}>
            {formatIsoDate(job.lastApplicationDate) || notProvided}
          </DetailField>
        </dl>
      </DetailSection>

      <DetailSection title={t("job.detail.sections.settings")}>
        <dl className="space-y-2">
          <DetailField label={t("job.detail.fields.coverLetterRequired")}>
            {settings?.coverLetterRequired
              ? t("jobForm.review.yes")
              : t("jobForm.review.no")}
          </DetailField>
          <DetailField label={t("job.detail.fields.attachmentsAllowed")}>
            {settings?.attachmentsAllowed
              ? t("jobForm.review.yes")
              : t("jobForm.review.no")}
          </DetailField>
          <DetailField label={t("job.detail.fields.maximumAttachments")}>
            {settings?.maximumAttachments ?? notProvided}
          </DetailField>
        </dl>
      </DetailSection>

      <DetailSection title={t("job.detail.sections.lifecycle")}>
        <dl className="space-y-2">
          <DetailField label={t("job.detail.fields.createdAt")}>
            {formatIsoDate(job.createdAt) || notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.updatedAt")}>
            {formatIsoDate(job.updatedAt) || notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.publishedAt")}>
            {formatIsoDate(job.publishedAt) || notProvided}
          </DetailField>
          <DetailField label={t("job.detail.fields.archivedAt")}>
            {formatIsoDate(job.archivedAt) || notProvided}
          </DetailField>
        </dl>
      </DetailSection>
    </div>
  );
}
