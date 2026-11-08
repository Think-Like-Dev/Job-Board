import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { CertificationPayloadSchema } from '@api/schemas/profile.schema';
import { useDeleteFile, useUploadProfileFile } from '@api/hooks/useProfile';
import { validateCertificationFile } from '@utils/validators';
import { getErrorMessage } from '@utils/errorMessage';
import { openAuthenticatedFile } from '@utils/fileActions';
import type {
  CertificationPayload,
  Skill,
} from '../../../types/profile.types';
import { SkillsInput } from './SkillsInput';

const EMPTY: CertificationPayload = {
  title: '',
  issuer: '',
  skillId: null,
  credentialUrl: '',
  fileId: null,
  issueDate: '',
  expiryDate: '',
};

interface CertificationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (value: CertificationPayload) => void;
  initialData?: CertificationPayload;
  skills: Skill[];
}

export function CertificationModal({
  open,
  onClose,
  onSave,
  initialData,
  skills,
}: CertificationModalProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CertificationPayload>({
    resolver: zodResolver(CertificationPayloadSchema),
    defaultValues: EMPTY,
  });
  const upload = useUploadProfileFile();
  const removeFile = useDeleteFile();
  const [uploaded, setUploaded] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      reset(initialData ?? EMPTY);
      setUploaded(null);
    }
  }, [open, initialData, reset]);

  const skillId = watch('skillId');
  const fileId = watch('fileId');
  const credentialUrl = watch('credentialUrl');

  function closeWithoutSaving() {
    if (uploaded && uploaded.id !== initialData?.fileId) {
      void removeFile.mutateAsync(uploaded.id).catch(() => undefined);
    }
    onClose();
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!validateCertificationFile(file)) {
      toast.error(t('profile.certifications.invalidFile'));
      return;
    }

    try {
      const result = await upload.mutateAsync({
        file,
        fileType: 'CERTIFICATION',
      });
      setValue('fileId', result.id, { shouldValidate: true });
      setUploaded({ id: result.id, name: result.filename ?? file.name });
    } catch (error) {
      toast.error(
        getErrorMessage(error, t('profile.certifications.invalidFile')),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeWithoutSaving()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? t('profile.certifications.modalTitleEdit')
              : t('profile.certifications.modalTitleAdd')}
          </DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-4 py-2"
          onSubmit={handleSubmit((value) => {
            if (
              value.issueDate &&
              value.expiryDate &&
              value.expiryDate < value.issueDate
            ) {
              setError('expiryDate', {
                type: 'validate',
                message: 'expiryBeforeIssue',
              });
              return;
            }
            onSave(value);
            onClose();
          })}
        >
          <div className="space-y-2">
            <Label>{t('profile.certifications.titleLabel')}</Label>
            <Input
              {...register('title')}
              placeholder={t('profile.certifications.titlePlaceholder')}
            />
            {errors.title && (
              <p className="text-xs text-destructive">
                {t('validation.required')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('profile.certifications.issuer')}</Label>
            <Input
              {...register('issuer')}
              placeholder={t('profile.certifications.issuerPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('profile.certifications.skill')}</Label>
            <SkillsInput
              value={skillId ? [skillId] : []}
              onChange={(ids) =>
                setValue('skillId', ids[0] ?? null, { shouldValidate: true })
              }
              initialSkills={skills}
              single
              placeholder={t('profile.certifications.skillPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('profile.certifications.credentialUrl')}</Label>
            <Input
              {...register('credentialUrl')}
              placeholder={t('profile.certifications.credentialUrlPlaceholder')}
            />
            {errors.credentialUrl && (
              <p className="text-xs text-destructive">
                {!credentialUrl && !fileId
                  ? t('profile.certifications.credentialRequired')
                  : t('profile.certifications.invalidUrl')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('profile.certifications.softCopyLabel')}</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.jfif,.png,.webp"
              disabled={upload.isPending}
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
            {upload.isPending && (
              <p className="text-xs text-muted-foreground">
                {t('common.uploading')}
              </p>
            )}
            {fileId && (
              <p className="text-xs text-muted-foreground">
                {t('profile.certifications.attached', {
                  name:
                    uploaded?.name ??
                    initialData?.fileName ??
                    t('profile.certifications.softCopy'),
                })}
                {fileId && (
                  <button
                    type="button"
                    className="ml-2 text-primary underline"
                    onClick={() => void openAuthenticatedFile(fileId)}
                  >
                    {t('common.view')}
                  </button>
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('profile.certifications.issueDate')}</Label>
              <Input type="date" {...register('issueDate')} />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.certifications.expiryDate')}</Label>
              <Input type="date" {...register('expiryDate')} />
              {errors.expiryDate && (
                <p className="text-xs text-destructive">
                  {t('profile.validation.expiryBeforeIssue')}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeWithoutSaving}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={upload.isPending}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
