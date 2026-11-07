import { useEffect, useState } from 'react';
import { XIcon } from 'lucide-react';
import { Label } from '@ui/label';
import { Input } from '@ui/input';
import { Slider } from '@ui/slider';
import { Button } from '@ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select';
import { Currency } from '@/types/job.types';
import { formatAmount } from '@/lib/jobFormat';
import {
  SALARY_MAX,
  SALARY_MIN,
  SALARY_STEP,
  type SalaryRange,
} from '../useJobSearch';

const ANY_CURRENCY = 'ANY';

interface SidebarFiltersProps {
  category?: string;
  onCategoryChange: (value?: string) => void;
  location?: string;
  onLocationChange: (value?: string) => void;
  yearsOfExperience?: string;
  onYearsOfExperienceChange: (value?: string) => void;
  currency?: string;
  onCurrencyChange: (value?: string) => void;
  salaryRange: SalaryRange;
  onSalaryRangeChange: (range: SalaryRange) => void;
  onClear: () => void;
  isFiltered: boolean;
}

/** Converts an input's raw value to an optional filter value. */
function toFilterValue(value: string): string | undefined {
  return value === '' ? undefined : value;
}

export function SidebarFilters({
  category,
  onCategoryChange,
  location,
  onLocationChange,
  yearsOfExperience,
  onYearsOfExperienceChange,
  currency,
  onCurrencyChange,
  salaryRange,
  onSalaryRangeChange,
  onClear,
  isFiltered,
}: SidebarFiltersProps) {
  const [draftRange, setDraftRange] = useState<SalaryRange>(salaryRange);

  useEffect(() => {
    setDraftRange(salaryRange);
  }, [salaryRange]);

  return (
    <aside className="w-full h-full">
      <div className="sticky top-24 space-y-6 bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-lg tracking-tight">Filters</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={!isFiltered}
          >
            <XIcon data-icon="inline-start" />
            Clear
          </Button>
        </div>

        {/* Salary range */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Salary Range</h4>

          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span className="bg-muted px-2 py-1 rounded font-semibold text-foreground tabular-nums">
              {formatAmount(draftRange[0])}
            </span>
            <span className="text-muted-foreground/60">–</span>
            <span className="bg-muted px-2 py-1 rounded font-semibold text-foreground tabular-nums">
              {formatAmount(draftRange[1])}
            </span>
          </div>

          <Slider
            value={draftRange}
            min={SALARY_MIN}
            max={SALARY_MAX}
            step={SALARY_STEP}
            onValueChange={(value) => setDraftRange(value as SalaryRange)}
            onValueCommitted={(value) =>
              onSalaryRangeChange(value as SalaryRange)
            }
            className="w-full"
          />

          <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1 tabular-nums">
            <span>{formatAmount(SALARY_MIN)}</span>
            <span>{formatAmount(SALARY_MAX)}+</span>
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Currency</h4>
          <Select
            value={currency ?? ANY_CURRENCY}
            onValueChange={(value) =>
              onCurrencyChange(
                value === ANY_CURRENCY || value === null ? undefined : value,
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue>{currency ?? 'Any currency'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_CURRENCY}>Any currency</SelectItem>
              {Object.values(Currency).map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t" />

        {/* Free-text filters — the API matches these with a case-insensitive
            contains query, so no fixed option list is needed. */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filter-category" className="font-medium text-sm">
              Category
            </Label>
            <Input
              id="filter-category"
              value={category ?? ''}
              onChange={(event) =>
                onCategoryChange(toFilterValue(event.target.value))
              }
              placeholder="e.g. Engineering"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-location" className="font-medium text-sm">
              Location
            </Label>
            <Input
              id="filter-location"
              value={location ?? ''}
              onChange={(event) =>
                onLocationChange(toFilterValue(event.target.value))
              }
              placeholder="e.g. Pune, India"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="filter-experience"
              className="font-medium text-sm"
            >
              Experience
            </Label>
            <Input
              id="filter-experience"
              value={yearsOfExperience ?? ''}
              onChange={(event) =>
                onYearsOfExperienceChange(toFilterValue(event.target.value))
              }
              placeholder="e.g. 3-6 years"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
