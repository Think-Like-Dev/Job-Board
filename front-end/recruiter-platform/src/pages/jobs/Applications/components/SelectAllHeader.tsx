import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "lucide-react";

import { Checkbox } from "@ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/dropdown-menu";

import type { ApplicationSelection } from "./selection.types";

interface SelectAllHeaderProps {
  selection: ApplicationSelection;
}

/**
 * Header checkbox for the candidate table. The checkbox toggles the current
 * page; the adjacent menu lets the recruiter select every filtered candidate
 * across pages or clear the selection.
 */
export function SelectAllHeader({ selection }: SelectAllHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1">
      <Checkbox
        checked={selection.isAllCurrentPageSelected}
        indeterminate={selection.isSomeCurrentPageSelected}
        onCheckedChange={(checked) => selection.onToggleCurrentPage(checked)}
        aria-label={t("job.applications.selection.selectPage")}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          aria-label={t("job.applications.selection.options")}
          className="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuItem
            disabled={selection.isAllCurrentPageSelected}
            onClick={() => selection.onToggleCurrentPage(true)}
          >
            {t("job.applications.selection.selectPage")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={
              selection.isSelectingAll || selection.filteredCount === 0
            }
            onClick={selection.onSelectAllFiltered}
          >
            {t("job.applications.selection.selectAllFilteredCount", {
              count: selection.filteredCount,
            })}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={selection.selectedIds.size === 0}
            onClick={selection.onClear}
          >
            {t("job.applications.selection.clear")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
