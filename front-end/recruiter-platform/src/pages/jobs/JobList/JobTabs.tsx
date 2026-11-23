import { useTranslation } from "react-i18next";

import { Tabs, TabsList, TabsTrigger } from "@ui/tabs";

import { JOB_TABS, type JobTabKey } from "./jobTabs.constants";

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
