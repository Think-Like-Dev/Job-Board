import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  BriefcaseIcon,
  DownloadIcon,
  ExternalLinkIcon,
  GraduationCapIcon,
  GlobeIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  AwardIcon,
} from "lucide-react";
import { toast } from "sonner";

import type {
  CandidateDetail,
  CandidateGap,
} from "@/api/schemas/candidates.schema";
import { Badge } from "@ui/badge";
import { Button } from "@ui/button";

import {
  candidateDisplayName,
  candidateInitials,
  formatExperienceMonths,
} from "@/lib/candidateFormat";
import { downloadAuthenticatedFile } from "@/lib/fileActions";
import { formatIsoDate } from "@/lib/jobFormat";

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function DateRange({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-muted-foreground">
      {formatIsoDate(startDate)} –{" "}
      {endDate ? formatIsoDate(endDate) : t("candidate.overview.present")}
    </p>
  );
}

function locationText(candidate: CandidateDetail): string | undefined {
  const current = candidate.currentLocation?.trim();
  if (current) return current;

  const composed = [candidate.city, candidate.state, candidate.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  return composed || candidate.address?.trim() || undefined;
}

function GapRow({ gap }: { gap: CandidateGap }) {
  const { t } = useTranslation();
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        {formatIsoDate(gap.startDate)} – {formatIsoDate(gap.endDate)}
      </span>
      <Badge variant="outline">
        {t("candidate.overview.gapMonths", { count: gap.months })}
      </Badge>
    </li>
  );
}

interface CandidateOverviewProps {
  candidate: CandidateDetail;
  onViewDocument?: (fileId: string, fileName?: string | null) => void;
}

/** Shared profile content for the detail panel and the eye-icon dialog. */
export function CandidateOverview({
  candidate,
  onViewDocument,
}: CandidateOverviewProps) {
  const { t } = useTranslation();
  const name = candidateDisplayName(candidate);
  const location = locationText(candidate);
  const resume = candidate.resume;

  const handleDownload = () => {
    if (!resume) return;
    void downloadAuthenticatedFile(resume.id, resume.filename ?? undefined).catch(
      () => toast.error(t("candidate.overview.downloadFailed")),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {candidateInitials(candidate)}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold">{name}</h2>
            {candidate.createdBy ? (
              <Badge variant="secondary">
                {t("candidate.source.recruiter")}
              </Badge>
            ) : null}
          </div>
          <p className="break-all text-sm text-muted-foreground">
            {candidate.email}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("candidate.overview.registered", {
              date: candidate.createdAt
                ? formatIsoDate(candidate.createdAt)
                : "—",
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
        {candidate.phone ? (
          <span className="inline-flex items-center gap-1.5">
            <PhoneIcon className="size-3.5" />
            {candidate.phone}
          </span>
        ) : null}
        {location ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="size-3.5" />
            {location}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <MailIcon className="size-3.5" />
          {candidate.email}
        </span>
        {candidate.linkedinUrl ? (
          <a
            href={candidate.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <LinkIcon className="size-3.5" />
            {t("candidate.overview.linkedin")}
          </a>
        ) : null}
        {candidate.portfolioUrl ? (
          <a
            href={candidate.portfolioUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <GlobeIcon className="size-3.5" />
            {t("candidate.overview.portfolio")}
          </a>
        ) : null}
      </div>

      <Section title={t("candidate.overview.resume")}>
        {resume ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border p-2.5">
            <span className="min-w-0 flex-1 truncate text-sm">
              {resume.filename ?? t("candidate.overview.resume")}
            </span>
            {onViewDocument ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onViewDocument(resume.id, resume.filename ?? undefined)
                }
              >
                <ExternalLinkIcon data-icon="inline-start" />
                {t("candidate.overview.viewResume")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <DownloadIcon data-icon="inline-start" />
              {t("candidate.overview.downloadResume")}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("candidate.overview.noResume")}
          </p>
        )}
      </Section>

      <Section title={t("candidate.overview.career")}>
        <div className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">
              {t("candidate.overview.totalExperience")}
            </p>
            <p className="font-medium">
              {formatExperienceMonths(candidate.totalExperienceMonths, t)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {t("candidate.overview.careerStart")}
            </p>
            <p className="font-medium">
              {candidate.careerStartDate
                ? formatIsoDate(candidate.careerStartDate)
                : "—"}
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("candidate.overview.careerGaps")}
          </p>
          {candidate.gaps.length ? (
            <ul className="space-y-1">
              {candidate.gaps.map((gap) => (
                <GapRow key={`${gap.startDate}-${gap.endDate}`} gap={gap} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("candidate.overview.noGaps")}
            </p>
          )}
        </div>
      </Section>

      <Section
        title={t("candidate.overview.experience")}
        icon={<BriefcaseIcon className="size-4" />}
      >
        {candidate.experience.length ? (
          <ul className="space-y-3">
            {candidate.experience.map((item) => (
              <li key={item.id} className="space-y-0.5">
                <p className="text-sm font-medium">{item.jobTitle}</p>
                <p className="text-sm text-muted-foreground">
                  {item.companyName}
                </p>
                <DateRange
                  startDate={item.startDate}
                  endDate={item.endDate}
                />
                {item.description ? (
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("candidate.overview.noExperience")}
          </p>
        )}
      </Section>

      <Section
        title={t("candidate.overview.education")}
        icon={<GraduationCapIcon className="size-4" />}
      >
        {candidate.education.length ? (
          <ul className="space-y-3">
            {candidate.education.map((item) => (
              <li key={item.id} className="space-y-0.5">
                <p className="text-sm font-medium">{item.degree}</p>
                <p className="text-sm text-muted-foreground">
                  {item.institution} · {item.fieldOfStudy}
                </p>
                <DateRange
                  startDate={item.startDate}
                  endDate={item.endDate}
                />
                {item.grade || item.gpa ? (
                  <p className="text-xs text-muted-foreground">
                    {[item.grade, item.gpa].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("candidate.overview.noEducation")}
          </p>
        )}
      </Section>

      <Section
        title={t("candidate.overview.certifications")}
        icon={<AwardIcon className="size-4" />}
      >
        {candidate.certifications.length ? (
          <ul className="space-y-3">
            {candidate.certifications.map((item) => (
              <li key={item.id} className="space-y-0.5">
                <p className="text-sm font-medium">{item.title}</p>
                {item.issuer ? (
                  <p className="text-sm text-muted-foreground">{item.issuer}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {[item.issueDate, item.expiryDate]
                    .filter(Boolean)
                    .map((value) => formatIsoDate(value as string))
                    .join(" – ")}
                </p>
                {item.credentialUrl ? (
                  <a
                    href={item.credentialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLinkIcon className="size-3" />
                    {t("candidate.overview.credential")}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("candidate.overview.noCertifications")}
          </p>
        )}
      </Section>
    </div>
  );
}
