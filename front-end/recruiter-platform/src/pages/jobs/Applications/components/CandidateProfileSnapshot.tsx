import { useTranslation } from "react-i18next";
import { BriefcaseIcon, GraduationCapIcon } from "lucide-react";

import { Badge } from "@ui/badge";

import { formatIsoDate } from "@/lib/jobFormat";
import type { ApplicationProfileSnapshot } from "@/types/application.types";

interface CandidateProfileSnapshotProps {
  profile: ApplicationProfileSnapshot;
}

function DateRange({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate?: string | null;
}) {
  const { t } = useTranslation();
  const start = formatIsoDate(startDate);
  const end = endDate ? formatIsoDate(endDate) : t("job.applications.drawer.profile.present");
  return (
    <p className="text-xs text-muted-foreground">
      {start} – {end}
    </p>
  );
}

/** Education, experience and skills captured with the application. */
export function CandidateProfileSnapshot({
  profile,
}: CandidateProfileSnapshotProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <GraduationCapIcon className="size-4" />
          {t("job.applications.drawer.profile.education")}
        </h3>
        {profile.education.length ? (
          <ul className="space-y-3">
            {profile.education.map((entry) => (
              <li key={entry.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">
                  {[entry.degree, entry.fieldOfStudy]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {entry.institution}
                </p>
                <DateRange
                  startDate={entry.startDate}
                  endDate={entry.endDate}
                />
                {entry.grade || entry.gpa ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[entry.grade, entry.gpa].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("job.applications.drawer.profile.noEducation")}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <BriefcaseIcon className="size-4" />
          {t("job.applications.drawer.profile.experience")}
        </h3>
        {profile.experience.length ? (
          <ul className="space-y-3">
            {profile.experience.map((entry) => (
              <li key={entry.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{entry.jobTitle}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.companyName}
                </p>
                <DateRange
                  startDate={entry.startDate}
                  endDate={entry.endDate}
                />
                {entry.description ? (
                  <p className="mt-1 whitespace-pre-line text-sm">
                    {entry.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("job.applications.drawer.profile.noExperience")}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">
          {t("job.applications.drawer.profile.skills")}
        </h3>
        {profile.skills.length ? (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <Badge key={skill.id} variant="secondary">
                {skill.name}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("job.applications.drawer.profile.noSkills")}
          </p>
        )}
      </section>
    </div>
  );
}
