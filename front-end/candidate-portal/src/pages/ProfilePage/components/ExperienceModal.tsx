import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog';
import { Button } from '@ui/button';
import { Checkbox } from '@ui/checkbox';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Textarea } from '@ui/textarea';
import { ExperiencePayloadSchema } from '@api/schemas/profile.schema';
import type { ExperiencePayload } from '../../../types/profile.types';

const EMPTY: ExperiencePayload = {
  companyName: '',
  jobTitle: '',
  startDate: '',
  endDate: null,
  salary: '',
  description: '',
};

interface ExperienceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (value: ExperiencePayload) => void;
  initialData?: ExperiencePayload;
}

export function ExperienceModal({
  open,
  onClose,
  onSave,
  initialData,
}: ExperienceModalProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ExperiencePayload>({
    resolver: zodResolver(ExperiencePayloadSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      reset(initialData ?? EMPTY);
    }
  }, [open, initialData, reset]);

  const endDate = watch('endDate');
  const isCurrent = endDate === null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? t('profile.experience.modalTitleEdit')
              : t('profile.experience.modalTitleAdd')}
          </DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4 py-2"
          onSubmit={handleSubmit((value) => {
            if (!isCurrent && !value.endDate) {
              setError('endDate', {
                type: 'required',
                message: 'required',
              });
              return;
            }
            if (
              value.endDate &&
              value.startDate &&
              value.endDate < value.startDate
            ) {
              setError('endDate', {
                type: 'validate',
                message: 'endBeforeStart',
              });
              return;
            }
            onSave(value);
            onClose();
          })}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('profile.experience.companyName')}</Label>
              <Input {...register('companyName')} />
              {errors.companyName && (
                <p className="text-xs text-destructive">
                  {t('validation.required')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('profile.experience.jobTitle')}</Label>
              <Input {...register('jobTitle')} />
              {errors.jobTitle && (
                <p className="text-xs text-destructive">
                  {t('validation.required')}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('profile.experience.startDate')}</Label>
              <Input type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="text-xs text-destructive">
                  {t('validation.required')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('profile.experience.endDate')}</Label>
              <Input type="date" disabled={isCurrent} {...register('endDate')} />
              {errors.endDate && (
                <p className="text-xs text-destructive">
                  {errors.endDate.type === 'required'
                    ? t('validation.required')
                    : t('profile.validation.endBeforeStart')}
                </p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isCurrent}
              onCheckedChange={(checked) => {
                setValue('endDate', checked ? null : '', {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
            {t('profile.experience.currentlyWorking')}
          </label>

          <div className="space-y-2">
            <Label>{t('profile.experience.salary')}</Label>
            <Input
              {...register('salary')}
              placeholder={t('profile.experience.salaryPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('profile.experience.descriptionLabel')}</Label>
            <Textarea
              {...register('description')}
              placeholder={t('profile.experience.descriptionPlaceholder')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{t('common.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
