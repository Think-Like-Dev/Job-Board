import { useTranslation } from "react-i18next";
import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@ui/button";
import { Input } from "@ui/input";
import type { SliderRange } from "@ui/slider";

import { CompensationFilterDropdown } from "./CompensationFilterDropdown";
import type { CompensationFilterMode } from "./compensationFilter";

interface JobListToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  compensationMode: CompensationFilterMode;
  onCompensationModeChange: (mode: CompensationFilterMode) => void;
  salaryRange: SliderRange;
  onSalaryRangeChange: (range: SliderRange) => void;
  onClear: () => void;
  isFiltered: boolean;
}

/** Search, compensation filter and clear action for the jobs list. */
export function JobListToolbar({
  search,
  onSearchChange,
  compensationMode,
  onCompensationModeChange,
  salaryRange,
  onSalaryRangeChange,
  onClear,
  isFiltered,
}: JobListToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background p-3 md:flex-row md:items-center">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("job.list.searchPlaceholder")}
          aria-label={t("job.list.searchPlaceholder")}
          className="ps-9"
        />
      </div>

      <CompensationFilterDropdown
        mode={compensationMode}
        range={salaryRange}
        onModeChange={onCompensationModeChange}
        onRangeChange={onSalaryRangeChange}
      />

      <Button
        type="button"
        variant="ghost"
        onClick={onClear}
        disabled={!isFiltered}
      >
        <XIcon data-icon="inline-start" />
        {t("job.list.clearFilters")}
      </Button>
    </div>
  );
}
