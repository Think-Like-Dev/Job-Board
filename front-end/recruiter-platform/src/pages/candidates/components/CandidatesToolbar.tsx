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
  CANDIDATE_SORT_LABEL_KEYS,
  CANDIDATE_SORT_OPTIONS,
  type CandidateSortValue,
} from "./candidateSort";

interface CandidatesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: CandidateSortValue;
  onSortChange: (value: CandidateSortValue) => void;
  onClear: () => void;
  isFiltered: boolean;
}

/** Candidate search and sort controls for the directory table. */
export function CandidatesToolbar({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  onClear,
  isFiltered,
}: CandidatesToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("candidate.list.searchPlaceholder")}
          aria-label={t("candidate.list.searchPlaceholder")}
          className="ps-9"
        />
      </div>

      <Select
        value={sortBy}
        onValueChange={(value) => onSortChange(value as CandidateSortValue)}
      >
        <SelectTrigger
          className="w-full md:w-56"
          aria-label={t("candidate.list.sortLabel")}
        >
          <SelectValue>{t(CANDIDATE_SORT_LABEL_KEYS[sortBy])}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CANDIDATE_SORT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {t(CANDIDATE_SORT_LABEL_KEYS[option])}
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
        {t("candidate.list.clearFilters")}
      </Button>
    </div>
  );
}
