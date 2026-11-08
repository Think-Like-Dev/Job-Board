import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
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
import { useApplyForJob } from '@api/hooks/useApplications';
import { useProfile } from '@api/hooks/useProfile';
import { getErrorMessage } from '@utils/errorMessage';
import { validateCoverLetter, validateResume } from '@utils/validators';
import type { Application, ApplyPayload } from '@/types/application.types';

interface ApplyWorkflowModalProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
  onApplied: () => void;
  coverLetterRequired?: boolean;
  /** Existing draft to continue; its files are kept unless a new one is chosen. */
  draft?: Application | null;
}

const STEPS = {
  DOCUMENTS: 0,
  PROFILE: 1,
  DECLARATION: 2,
} as const;

export function ApplyWorkflowModal({
  jobId,
  isOpen,
  onClose,
  onApplied,
  coverLetterRequired = false,
  draft = null,
}: ApplyWorkflowModalProps) {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const applyMutation = useApplyForJob();

  const [step, setStep] = useState<number>(STEPS.DOCUMENTS);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);
  const [updateCentralResume, setUpdateCentralResume] = useState(false);
  const [updateCentralCoverLetter, setUpdateCentralCoverLetter] =
    useState(false);
  const [declared, setDeclared] = useState(false);

  const hasResume = Boolean(
    profile?.resume || draft?.resumeFileId || resumeFile,
  );
  const hasCoverLetter = Boolean(
    profile?.coverLetter || draft?.coverLetterFileId || coverLetterFile,
  );

  function handleResumeFile(selected: File | undefined) {
    if (!selected) return;
    if (!validateResume(selected)) {
      toast.error(t('apply.resume.invalid'));
      return;
    }
    setResumeFile(selected);
  }

  function handleCoverLetterFile(selected: File | undefined) {
    if (!selected) return;
    if (!validateCoverLetter(selected)) {
      toast.error(t('apply.coverLetter.invalid'));
      return;
    }
    setCoverLetterFile(selected);
  }

  function validateDocuments(forSubmit: boolean): boolean {
    if (!hasResume) {
      toast.error(t('apply.resume.required'));
      return false;
    }
    if (forSubmit && coverLetterRequired && !hasCoverLetter) {
      toast.error(t('apply.coverLetter.required'));
      return false;
    }
    return true;
  }

  function nextStep() {
    if (step === STEPS.DOCUMENTS && !validateDocuments(false)) return;
    setStep((current) => Math.min(current + 1, STEPS.DECLARATION));
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, STEPS.DOCUMENTS));
  }

  function buildPayload(isDraft: boolean): ApplyPayload {
    return {
      isDraft,
      resumeFile: resumeFile ?? undefined,
      coverLetterFile: coverLetterFile ?? undefined,
      updateProfileResume:
        !isDraft && Boolean(resumeFile) && updateCentralResume,
      updateProfileCoverLetter:
        !isDraft && Boolean(coverLetterFile) && updateCentralCoverLetter,
    };
  }

  async function submit(isDraft: boolean) {
    if (!validateDocuments(!isDraft)) return;

    try {
      await applyMutation.mutateAsync({
        jobId,
        payload: buildPayload(isDraft),
      });
      toast.success(
        isDraft ? t('apply.draftSaved') : t('apply.submitted'),
      );
      if (!isDraft) onApplied();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, t('apply.failed')));
    }
  }

  const profileName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
    t('apply.profile.none');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('apply.title')}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === STEPS.DOCUMENTS && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">
                {t('apply.steps.documents')}
              </h3>

              <div className="space-y-3">
                <Label>
                  {t('apply.resume.label')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                {profile?.resume ? (
                  <p className="text-sm text-muted-foreground">
                    {t('apply.resume.central')}: {profile.resume.filename}
                  </p>
                ) : draft?.resumeFileId ? (
                  <p className="text-sm text-muted-foreground">
                    {t('apply.resume.draft')}: {draft.resumeFileName}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('apply.resume.noCentral')}
                  </p>
                )}
                <Input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(event) =>
                    handleResumeFile(event.target.files?.[0])
                  }
                />
                {resumeFile && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={updateCentralResume}
                      onCheckedChange={(checked) =>
                        setUpdateCentralResume(checked === true)
                      }
                    />
                    {t('apply.resume.updateCentral')}
                  </label>
                )}
              </div>

              <div className="space-y-3">
                <Label>
                  {t('apply.coverLetter.label')}{' '}
                  <span className="text-muted-foreground">
                    ({t('apply.coverLetter.optional')})
                  </span>
                  {coverLetterRequired && (
                    <span className="text-destructive"> *</span>
                  )}
                </Label>
                {profile?.coverLetter ? (
                  <p className="text-sm text-muted-foreground">
                    {t('apply.coverLetter.central')}:{' '}
                    {profile.coverLetter.filename}
                  </p>
                ) : draft?.coverLetterFileId ? (
                  <p className="text-sm text-muted-foreground">
                    {t('apply.coverLetter.draft')}:{' '}
                    {draft.coverLetterFileName}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('apply.coverLetter.noCentral')}
                  </p>
                )}
                <Input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(event) =>
                    handleCoverLetterFile(event.target.files?.[0])
                  }
                />
                {coverLetterFile && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={updateCentralCoverLetter}
                      onCheckedChange={(checked) =>
                        setUpdateCentralCoverLetter(checked === true)
                      }
                    />
                    {t('apply.coverLetter.updateCentral')}
                  </label>
                )}
              </div>
            </div>
          )}

          {step === STEPS.PROFILE && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">
                {t('apply.steps.profile')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('apply.profile.description')}
              </p>

              <div className="space-y-4 rounded-md border p-4">
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {t('apply.profile.name')}
                  </span>
                  <span>{profileName}</span>
                  <span className="text-muted-foreground">
                    {t('apply.profile.email')}
                  </span>
                  <span>{profile?.email ?? t('apply.profile.none')}</span>
                  <span className="text-muted-foreground">
                    {t('apply.profile.phone')}
                  </span>
                  <span>{profile?.phone ?? t('apply.profile.none')}</span>
                  <span className="text-muted-foreground">
                    {t('apply.profile.skills')}
                  </span>
                  <span>
                    {profile?.skills.length
                      ? profile.skills.map((skill) => skill.name).join(', ')
                      : t('apply.profile.none')}
                  </span>
                  <span className="text-muted-foreground">
                    {t('apply.profile.experience')}
                  </span>
                  <span>
                    {profile?.experience.length
                      ? profile.experience
                          .map(
                            (item) =>
                              `${item.jobTitle} · ${item.companyName}`,
                          )
                          .join(', ')
                      : t('apply.profile.none')}
                  </span>
                  <span className="text-muted-foreground">
                    {t('apply.profile.education')}
                  </span>
                  <span>
                    {profile?.education.length
                      ? profile.education
                          .map(
                            (item) => `${item.degree} · ${item.institution}`,
                          )
                          .join(', ')
                      : t('apply.profile.none')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === STEPS.DECLARATION && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">
                {t('apply.steps.declaration')}
              </h3>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="declaration"
                  checked={declared}
                  onCheckedChange={(checked) => setDeclared(checked === true)}
                />
                <Label
                  htmlFor="declaration"
                  className="font-normal leading-relaxed"
                >
                  {t('apply.declaration.text')}
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t pt-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void submit(true)}
            disabled={applyMutation.isPending}
          >
            {t('apply.actions.draft')}
          </Button>
          <div className="flex gap-2">
            {step > STEPS.DOCUMENTS && (
              <Button type="button" variant="outline" onClick={previousStep}>
                {t('apply.actions.back')}
              </Button>
            )}
            {step < STEPS.DECLARATION ? (
              <Button type="button" onClick={nextStep}>
                {t('apply.actions.next')}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void submit(false)}
                disabled={!declared || applyMutation.isPending}
              >
                {applyMutation.isPending
                  ? t('apply.actions.submitting')
                  : t('apply.actions.submit')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
