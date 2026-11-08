import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog';
import { Button } from '@ui/button';
import { JobFiltersForm } from './JobFiltersForm';
import {
  DEFAULT_SALARY_RANGE,
  type JobFilterDraft,
} from '../useJobSearch';

interface FiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: JobFilterDraft;
  onApply: (value: JobFilterDraft) => void;
  onClear: () => void;
}

/**
 * Popup filter editor. The draft only reaches the job query when the user
 * presses Apply, so typing in a field does not refetch on every keystroke.
 */
export function FiltersDialog({
  open,
  onOpenChange,
  value,
  onApply,
  onClear,
}: FiltersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        {open && (
          <FiltersDialogBody
            value={value}
            onApply={onApply}
            onClear={onClear}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FiltersDialogBodyProps {
  value: JobFilterDraft;
  onApply: (value: JobFilterDraft) => void;
  onClear: () => void;
  onClose: () => void;
}

function FiltersDialogBody({
  value,
  onApply,
  onClear,
  onClose,
}: FiltersDialogBodyProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<JobFilterDraft>(value);

  const clear = () => {
    setDraft({ salaryRange: DEFAULT_SALARY_RANGE });
    onClear();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('jobs.filters.title')}</DialogTitle>
      </DialogHeader>

      <div className="py-4">
        <JobFiltersForm value={draft} onChange={setDraft} />
      </div>

      <DialogFooter className="flex-row justify-between">
        <Button type="button" variant="ghost" onClick={clear}>
          {t('jobs.filters.clear')}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {t('jobs.filters.apply')}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
