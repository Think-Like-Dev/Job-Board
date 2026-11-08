import { useTranslation } from 'react-i18next';
import { Label } from '@ui/label';
import { Input } from '@ui/input';
import { Slider } from '@ui/slider';
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
  type JobFilterDraft,
  type SalaryRange,
} from '../useJobSearch';

const ANY_CURRENCY = 'ANY';

interface JobFiltersFormProps {
  value: JobFilterDraft;
  onChange: (value: JobFilterDraft) => void;
}

/** Converts an input's raw value to an optional filter value. */
function toFilterValue(value: string): string | undefined {
  return value === '' ? undefined : value;
}

/** Controlled filter fields shared by the desktop popup and mobile dialog. */
export function JobFiltersForm({ value, onChange }: JobFiltersFormProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-medium text-sm">
          {t('jobs.filters.salaryRange')}
        </h4>

        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="rounded bg-muted px-2 py-1 font-semibold tabular-nums text-foreground">
            {formatAmount(value.salaryRange[0])}
          </span>
          <span className="text-muted-foreground/60">–</span>
          <span className="rounded bg-muted px-2 py-1 font-semibold tabular-nums text-foreground">
            {formatAmount(value.salaryRange[1])}
          </span>
        </div>

        <Slider
          value={value.salaryRange}
          min={SALARY_MIN}
          max={SALARY_MAX}
          step={SALARY_STEP}
          onValueChange={(range) =>
            onChange({ ...value, salaryRange: range as SalaryRange })
          }
          className="w-full"
        />

        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground/60">
          <span>{formatAmount(SALARY_MIN)}</span>
          <span>{formatAmount(SALARY_MAX)}+</span>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-sm">{t('jobs.filters.currency')}</h4>
        <Select
          value={value.currency ?? ANY_CURRENCY}
          onValueChange={(next) =>
            onChange({
              ...value,
              currency:
                next === ANY_CURRENCY || next === null ? undefined : next,
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {value.currency ?? t('jobs.filters.anyCurrency')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_CURRENCY}>
              {t('jobs.filters.anyCurrency')}
            </SelectItem>
            {Object.values(Currency).map((currency) => (
              <SelectItem key={currency} value={currency}>
                {currency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-t" />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="filter-category" className="font-medium text-sm">
            {t('jobs.filters.category')}
          </Label>
          <Input
            id="filter-category"
            value={value.category ?? ''}
            onChange={(event) =>
              onChange({
                ...value,
                category: toFilterValue(event.target.value),
              })
            }
            placeholder={t('jobs.filters.categoryPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-location" className="font-medium text-sm">
            {t('jobs.filters.location')}
          </Label>
          <Input
            id="filter-location"
            value={value.location ?? ''}
            onChange={(event) =>
              onChange({
                ...value,
                location: toFilterValue(event.target.value),
              })
            }
            placeholder={t('jobs.filters.locationPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="filter-experience" className="font-medium text-sm">
            {t('jobs.filters.experience')}
          </Label>
          <Input
            id="filter-experience"
            value={value.yearsOfExperience ?? ''}
            onChange={(event) =>
              onChange({
                ...value,
                yearsOfExperience: toFilterValue(event.target.value),
              })
            }
            placeholder={t('jobs.filters.experiencePlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}
