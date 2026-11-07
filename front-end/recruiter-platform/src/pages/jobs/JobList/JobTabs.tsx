import { useTranslation } from "react-i18next";

import { Tabs, TabsList, TabsTrigger } from "@ui/tabs";

import { JobStatus } from "@/types/job.types";

export type JobTabKey = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Ordered list page tabs and the status each one queries. */
export const JOB_TABS: readonly JobTabKey[] = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
];

export const JOB_TAB_STATUS: Record<JobTabKey, JobStatus> = {
  DRAFT: JobStatus.DRAFT,
  PUBLISHED: JobStatus.PUBLISHED,
  ARCHIVED: JobStatus.ARCHIVED,
};

interface JobTabsProps {
  value: JobTabKey;
  onChange: (value: JobTabKey) => void;
}

/** Status tabs for the recruiter jobs list. */
export function JobTabs({ value, onChange }: JobTabsProps) {
  const { t } = useTranslation();

  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as JobTabKey)}
    >
      <TabsList variant="line">
        {JOB_TABS.map((tab) => (
          <TabsTrigger key={tab} value={tab}>
            {t(`job.tabs.${tab}`)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
