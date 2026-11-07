import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckIcon,
  ChevronDownIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { Button } from "@ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ui/popover";
import { RangeSlider, type SliderRange } from "@ui/slider";

import {
  RANGE_DEBOUNCE_MS,
  SALARY_RANGE_MAX,
  SALARY_RANGE_MIN,
  SALARY_RANGE_STEP,
  formatAmount,
  formatSalaryRange,
  type CompensationFilterMode,
} from "./compensationFilter";

type StaticMode = Exclude<CompensationFilterMode, "RANGE">;

const STATIC_MODES: StaticMode[] = ["ALL", "NONE", "NEGOTIABLE"];

interface CompensationFilterDropdownProps {
  mode: CompensationFilterMode;
  range: SliderRange;
  onModeChange: (mode: CompensationFilterMode) => void;
  onRangeChange: (range: SliderRange) => void;
}

/**
 * Compensation filter dropdown. The salary-range option embeds a two-thumb
 * slider; its value is committed (and the dropdown closes) after the cursor
 * has been idle for two seconds.
 */
export function CompensationFilterDropdown({
  mode,
  range,
  onModeChange,
  onRangeChange,
}: CompensationFilterDropdownProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<SliderRange>(range);
  const committedRangeRef = useRef<SliderRange>(range);
  const onRangeChangeRef = useRef(onRangeChange);
  onRangeChangeRef.current = onRangeChange;

  // Keep the draft in sync with the committed value (e.g. after Clear).
  useEffect(() => {
    committedRangeRef.current = range;
    setDraftRange(range);
  }, [range]);

  // Commit two seconds after the last slider movement. The timer keeps
  // running even if the popover was closed in the meantime.
  useEffect(() => {
    if (mode !== "RANGE") return;

    const committed = committedRangeRef.current;
    if (
      draftRange[0] === committed[0] &&
      draftRange[1] === committed[1]
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      committedRangeRef.current = draftRange;
      onRangeChangeRef.current(draftRange);
      setOpen(false);
    }, RANGE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [draftRange, mode]);

  const label =
    mode === "RANGE"
      ? formatSalaryRange(range)
      : t(`job.list.compensationOptions.${mode}`);

  const selectMode = (next: StaticMode) => {
    onModeChange(next);
    setOpen(false);
  };

  const selectRange = () => {
    onModeChange("RANGE");
    setDraftRange(range);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label={`${t("job.list.compensationFilter")}: ${label}`}
            className="w-full justify-between md:w-64"
          />
        }
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <SlidersHorizontalIcon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80">
        <p className="px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("job.list.compensation")}
        </p>

        <div className="flex flex-col gap-0.5">
          {STATIC_MODES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => selectMode(option)}
              aria-pressed={mode === option}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted"
            >
              <span>{t(`job.list.compensationOptions.${option}`)}</span>
              {mode === option && <CheckIcon className="size-4" />}
            </button>
          ))}

          <button
            type="button"
            onClick={selectRange}
            aria-pressed={mode === "RANGE"}
            className="flex items-center justify-between rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted"
          >
            <span>{t("job.list.compensationOptions.RANGE")}</span>
            {mode === "RANGE" && <CheckIcon className="size-4" />}
          </button>
        </div>

        {mode === "RANGE" && (
          <div className="flex flex-col gap-2 rounded-md bg-muted/40 p-2">
            <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatAmount(draftRange[0])}</span>
              <span>{formatAmount(draftRange[1])}</span>
            </div>

            <RangeSlider
              value={draftRange}
              min={SALARY_RANGE_MIN}
              max={SALARY_RANGE_MAX}
              step={SALARY_RANGE_STEP}
              minLabel={t("job.list.compensationRange.min")}
              maxLabel={t("job.list.compensationRange.max")}
              onValueChange={setDraftRange}
            />

          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
