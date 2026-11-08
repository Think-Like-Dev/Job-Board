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
import { EducationPayloadSchema } from '@api/schemas/profile.schema';
import type { EducationPayload } from '../../../types/profile.types';

const EMPTY: EducationPayload = {
  institution: '',
  degree: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: null,
  grade: '',
  gpa: null,
  additionalDetails: '',
};

interface EducationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (value: EducationPayload) => void;
  initialData?: EducationPayload;
}

export function EducationModal({
  open,
  onClose,
  onSave,
  initialData,
}: EducationModalProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<EducationPayload>({
    resolver: zodResolver(EducationPayloadSchema),
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
      <DialogContent className="sm:max-w-140">
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? t('profile.education.modalTitleEdit')
              : t('profile.education.modalTitleAdd')}
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
          <div className="space-y-2">
            <Label>{t('profile.education.institutionName')}</Label>
            <Input {...register('institution')} />
            {errors.institution && (
              <p className="text-xs text-destructive">
                {t('validation.required')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('profile.education.degree')}</Label>
              <Input {...register('degree')} />
              {errors.degree && (
                <p className="text-xs text-destructive">
                  {t('validation.required')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('profile.education.fieldOfStudy')}</Label>
              <Input {...register('fieldOfStudy')} />
              {errors.fieldOfStudy && (
                <p className="text-xs text-destructive">
                  {t('validation.required')}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('profile.education.startDate')}</Label>
              <Input type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="text-xs text-destructive">
                  {t('validation.required')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('profile.education.endDate')}</Label>
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
            {t('profile.education.currentlyStudying')}
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('profile.education.grade')}</Label>
              <Input
                {...register('grade')}
                placeholder={t('profile.education.gradePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.education.gpa')}</Label>
              <Input
                type="number"
                step="0.01"
                {...register('gpa', {
                  setValueAs: (value) =>
                    value === '' || value === null ? null : Number(value),
                })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('profile.education.additionalDetails')}</Label>
            <Textarea
              {...register('additionalDetails')}
              placeholder={t('profile.education.additionalDetailsPlaceholder')}
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
