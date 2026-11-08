import { useTranslation } from "react-i18next";
import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@ui/button";
import { Input } from "@ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/select";

import {
  APPLICATION_FILTER_STATUSES,
  type ApplicationStatus,
} from "@/types/application.types";

const ALL_STATUSES = "ALL";

interface ApplicationsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status?: ApplicationStatus;
  onStatusChange: (status?: ApplicationStatus) => void;
  onClear: () => void;
  isFiltered: boolean;
}

/** Candidate search and status filter for the applications table. */
export function ApplicationsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  onClear,
  isFiltered,
}: ApplicationsToolbarProps) {
  const { t } = useTranslation();
  const statusValue = status ?? ALL_STATUSES;

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("job.applications.searchPlaceholder")}
          aria-label={t("job.applications.searchPlaceholder")}
          className="ps-9"
        />
      </div>

      <Select
        value={statusValue}
        onValueChange={(value) =>
          onStatusChange(
            value === ALL_STATUSES ? undefined : (value as ApplicationStatus),
          )
        }
      >
        <SelectTrigger
          className="w-full md:w-56"
          aria-label={t("job.applications.statusFilter")}
        >
          <SelectValue>
            {status
              ? t(`job.applications.status.${status}`)
              : t("job.applications.allStatuses")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUSES}>
            {t("job.applications.allStatuses")}
          </SelectItem>
          {APPLICATION_FILTER_STATUSES.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`job.applications.status.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="ghost"
        onClick={onClear}
        disabled={!isFiltered}
      >
        <XIcon data-icon="inline-start" />
        {t("job.applications.clearFilters")}
      </Button>
    </div>
  );
}
