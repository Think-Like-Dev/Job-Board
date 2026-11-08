import { useEffect, useRef, useState } from 'react';
import { useIsMutating, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Skeleton } from '@ui/skeleton';
import { API_ENDPOINTS } from '@api/endpoints.config';
import { QUERY_KEYS } from '@api/hooks/queryKeys';
import { ProfileFormSchema } from '@api/schemas/profile.schema';
import type { ProfileFormValues } from '@api/schemas/profile.schema';
import { useProfile, useUpdateProfile } from '@api/hooks/useProfile';
import { getErrorMessage } from '@utils/errorMessage';
import {
  validateCoverLetter,
  validateResume,
} from '@utils/validators';
import type {
  CandidateProfile,
  CertificationPayload,
  EducationPayload,
  ExperiencePayload,
  ProfileFile,
  Skill,
  UpdateProfilePayload,
  UploadedFile,
} from '../../types/profile.types';
import { EducationTable } from './components/EducationTable';
import { EducationModal } from './components/EducationModal';
import { ExperienceTable } from './components/ExperienceTable';
import { ExperienceModal } from './components/ExperienceModal';
import { CertificationsTable } from './components/CertificationsTable';
import { CertificationModal } from './components/CertificationModal';
import { SkillsInput } from './components/SkillsInput';
import { DocumentUploadCard } from './components/DocumentUploadCard';
import { ProfileImageUpload } from './components/ProfileImageUpload';

const EMPTY_FORM: ProfileFormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  currentLocation: '',
  address: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  linkedinUrl: '',
  portfolioUrl: '',
  education: [],
  experience: [],
  skillIds: [],
  certifications: [],
};

/** Keeps `<input type="date">` working when the API returns a timestamp. */
function toDateInput(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > 10 ? trimmed.slice(0, 10) : trimmed;
}

function trimToNull(value?: string | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toGpa(value?: string | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFormValues(profile: CandidateProfile): ProfileFormValues {
  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    phone: profile.phone ?? '',
    currentLocation: profile.currentLocation ?? '',
    address: profile.address ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    country: profile.country ?? '',
    postalCode: profile.postalCode ?? '',
    linkedinUrl: profile.linkedinUrl ?? '',
    portfolioUrl: profile.portfolioUrl ?? '',
    education: profile.education.map((item) => ({
      ...item,
      startDate: toDateInput(item.startDate) ?? '',
      endDate: toDateInput(item.endDate),
      grade: item.grade ?? '',
      gpa: toGpa(item.gpa),
      additionalDetails: item.additionalDetails ?? '',
    })),
    experience: profile.experience.map((item) => ({
      ...item,
      startDate: toDateInput(item.startDate) ?? '',
      endDate: toDateInput(item.endDate),
      salary: item.salary ?? '',
      description: item.description ?? '',
    })),
    skillIds: profile.skills.map((skill) => skill.id),
    certifications: profile.certifications.map((item) => ({
      id: item.id,
      title: item.title,
      issuer: item.issuer ?? '',
      skillId: item.skillId ?? null,
      skillName: item.skillName ?? null,
      credentialUrl: item.credentialUrl ?? '',
      fileId: item.fileId ?? null,
      fileName: item.fileName ?? null,
      fileUrl: item.fileUrl ?? null,
      issueDate: toDateInput(item.issueDate) ?? '',
      expiryDate: toDateInput(item.expiryDate) ?? '',
    })),
  };
}

/** Converts empty form controls to the nulls the API expects. */
function toUpdatePayload(values: ProfileFormValues): UpdateProfilePayload {
  return {
    firstName: (values.firstName ?? '').trim(),
    lastName: (values.lastName ?? '').trim(),
    phone: trimToNull(values.phone),
    currentLocation: trimToNull(values.currentLocation),
    address: trimToNull(values.address),
    city: trimToNull(values.city),
    state: trimToNull(values.state),
    country: trimToNull(values.country),
    postalCode: trimToNull(values.postalCode),
    linkedinUrl: trimToNull(values.linkedinUrl),
    portfolioUrl: trimToNull(values.portfolioUrl),
    education: values.education.map((item) => ({
      id: item.id,
      institution: item.institution.trim(),
      degree: item.degree.trim(),
      fieldOfStudy: item.fieldOfStudy.trim(),
      startDate: toDateInput(item.startDate) ?? '',
      endDate: toDateInput(item.endDate),
      grade: trimToNull(item.grade),
      gpa: item.gpa ?? null,
      additionalDetails: trimToNull(item.additionalDetails),
    })),
    experience: values.experience.map((item) => ({
      id: item.id,
      companyName: item.companyName.trim(),
      jobTitle: item.jobTitle.trim(),
      startDate: toDateInput(item.startDate) ?? '',
      endDate: toDateInput(item.endDate),
      salary: trimToNull(item.salary),
      description: trimToNull(item.description),
    })),
    skillIds: values.skillIds,
    certifications: values.certifications.map((item) => ({
      id: item.id,
      title: item.title.trim(),
      issuer: trimToNull(item.issuer),
      skillId: item.skillId ?? null,
      credentialUrl: trimToNull(item.credentialUrl),
      fileId: item.fileId ?? null,
      issueDate: toDateInput(item.issueDate),
      expiryDate: toDateInput(item.expiryDate),
    })),
  };
}

function toProfileFile(uploaded: UploadedFile): ProfileFile {
  const contentUrl = API_ENDPOINTS.FILES.CONTENT(uploaded.id);
  return {
    id: uploaded.id,
    filename: uploaded.filename ?? null,
    mimeType: uploaded.mimeType ?? null,
    size: uploaded.size ?? null,
    url: contentUrl,
    downloadUrl: `${contentUrl}?download=true`,
  };
}

interface EducationModalState {
  open: boolean;
  index?: number;
}

interface ExperienceModalState {
  open: boolean;
  index?: number;
}

interface CertificationModalState {
  open: boolean;
  index?: number;
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const isUploading = useIsMutating({ mutationKey: ['profile', 'upload'] }) > 0;
  const initialized = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: EMPTY_FORM,
  });

  const [educationModal, setEducationModal] = useState<EducationModalState>({
    open: false,
  });
  const [experienceModal, setExperienceModal] =
    useState<ExperienceModalState>({ open: false });
  const [certificationModal, setCertificationModal] =
    useState<CertificationModalState>({ open: false });
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!profile || initialized.current) return;
    initialized.current = true;
    reset(toFormValues(profile));
  }, [profile, reset]);

  const education = watch('education') ?? [];
  const experience = watch('experience') ?? [];
  const certifications = watch('certifications') ?? [];
  const skillIds = watch('skillIds') ?? [];

  const certificationSkills: Skill[] = [...(profile?.skills ?? [])];
  for (const certification of profile?.certifications ?? []) {
    if (
      certification.skillId &&
      certification.skillName &&
      !certificationSkills.some((skill) => skill.id === certification.skillId)
    ) {
      certificationSkills.push({
        id: certification.skillId,
        name: certification.skillName,
      });
    }
  }

  async function persistFile(
    patch: UpdateProfilePayload,
    optimistic?: Partial<CandidateProfile>,
  ): Promise<void> {
    const previous = queryClient.getQueryData<CandidateProfile>(
      QUERY_KEYS.PROFILE.ME,
    );

    // File inputs save immediately, even before the rest of the mandatory
    // profile is complete. Update the cached profile first so the filename
    // and preview appear as soon as the upload returns.
    if (optimistic && previous) {
      queryClient.setQueryData(QUERY_KEYS.PROFILE.ME, {
        ...previous,
        ...optimistic,
      });
    }

    try {
      await updateProfile.mutateAsync(patch);
    } catch (error) {
      if (previous) {
        queryClient.setQueryData(QUERY_KEYS.PROFILE.ME, previous);
      }
      // The response parse can fail after the server saved; refetch to settle.
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE.ME });
      toast.error(getErrorMessage(error, t('profile.saveFailed')));
    }
  }

  const onSubmit = handleSubmit(
    async (values) => {
      setSubmitAttempted(true);

      if (!profile?.profileImage || !profile?.resume || education.length === 0) {
        toast.error(t('profile.validation.mandatory'));
        return;
      }

      try {
        const saved = await updateProfile.mutateAsync(toUpdatePayload(values));
        reset(toFormValues(saved));
        setSubmitAttempted(false);
        toast.success(t('profile.saved'));
      } catch (error) {
        toast.error(getErrorMessage(error, t('profile.saveFailed')));
      }
    },
    () => {
      setSubmitAttempted(true);
      toast.error(t('profile.validation.invalid'));
    },
  );

  const profileImageError =
    submitAttempted && !profile?.profileImage
      ? t('profile.photo.required')
      : null;
  const resumeError =
    submitAttempted && !profile?.resume
      ? t('profile.documents.resume.required')
      : null;
  const educationError =
    submitAttempted && education.length === 0
      ? t('profile.education.required')
      : null;

  function saveEducation(value: EducationPayload) {
    const next = [...education];
    if (educationModal.index === undefined) {
      next.push(value);
    } else {
      next[educationModal.index] = value;
    }
    setValue('education', next, { shouldDirty: true, shouldValidate: true });
  }

  function saveExperience(value: ExperiencePayload) {
    const next = [...experience];
    if (experienceModal.index === undefined) {
      next.push(value);
    } else {
      next[experienceModal.index] = value;
    }
    setValue('experience', next, { shouldDirty: true, shouldValidate: true });
  }

  function saveCertification(value: CertificationPayload) {
    const next = [...certifications];
    if (certificationModal.index === undefined) {
      next.push(value);
    } else {
      next[certificationModal.index] = value;
    }
    setValue('certifications', next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl space-y-8 px-4 py-12">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const editingEducation =
    educationModal.index === undefined
      ? undefined
      : education[educationModal.index];
  const editingExperience =
    experienceModal.index === undefined
      ? undefined
      : experience[experienceModal.index];
  const editingCertification =
    certificationModal.index === undefined
      ? undefined
      : certifications[certificationModal.index];

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('profile.title')}
        </h1>
        <p className="mt-2 text-muted-foreground">{t('profile.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.basicInfo.title')}</CardTitle>
          <CardDescription>{t('profile.basicInfo.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-8 sm:flex-row">
            <ProfileImageUpload
              file={profile?.profileImage}
              required
              error={profileImageError}
              onUploaded={(uploaded) =>
                persistFile(
                  { profileImageFileId: uploaded.id },
                  { profileImage: toProfileFile(uploaded) },
                )
              }
              onRemove={() =>
                persistFile(
                  { profileImageFileId: null },
                  { profileImage: null },
                )
              }
            />

            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  {t('profile.fields.firstName')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">
                    {t('profile.validation.nameRequired')}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  {t('profile.fields.lastName')}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">
                    {t('profile.validation.nameRequired')}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('profile.fields.email')}</Label>
                <Input value={profile?.email ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.fields.phone')}</Label>
                <Input {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.fields.currentLocation')}</Label>
                <Input {...register('currentLocation')} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.fields.address')}</Label>
                <Input {...register('address')} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.fields.city')}</Label>
                <Input {...register('city')} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.fields.state')}</Label>
                <Input {...register('state')} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.fields.country')}</Label>
                <Input {...register('country')} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.fields.postalCode')}</Label>
                <Input {...register('postalCode')} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.fields.linkedinUrl')}</Label>
                <Input {...register('linkedinUrl')} placeholder="https://" />
                {errors.linkedinUrl && (
                  <p className="text-xs text-destructive">
                    {t('validation.invalid')}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('profile.fields.portfolioUrl')}</Label>
                <Input {...register('portfolioUrl')} placeholder="https://" />
                {errors.portfolioUrl && (
                  <p className="text-xs text-destructive">
                    {t('validation.invalid')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-8 pt-6">
          <DocumentUploadCard
            title={t('profile.documents.resume.title')}
            description={t('profile.documents.resume.description')}
            file={profile?.resume}
            fileType="RESUME"
            accept=".pdf,.docx"
            uploadLabel={t('profile.documents.resume.upload')}
            replaceLabel={t('profile.documents.resume.replace')}
            noneLabel={t('profile.documents.resume.none')}
            invalidMessage={t('profile.documents.resume.invalid')}
            required
            error={resumeError}
            validate={validateResume}
            onUploaded={(uploaded) =>
              persistFile(
                { resumeFileId: uploaded.id },
                { resume: toProfileFile(uploaded) },
              )
            }
          />

          <DocumentUploadCard
            title={t('profile.documents.coverLetter.title')}
            description={t('profile.documents.coverLetter.description')}
            file={profile?.coverLetter}
            fileType="COVER_LETTER"
            accept=".pdf,.docx"
            uploadLabel={t('profile.documents.coverLetter.upload')}
            replaceLabel={t('profile.documents.coverLetter.replace')}
            noneLabel={t('profile.documents.coverLetter.none')}
            invalidMessage={t('profile.documents.coverLetter.invalid')}
            validate={validateCoverLetter}
            onUploaded={(uploaded) =>
              persistFile(
                { coverLetterFileId: uploaded.id },
                { coverLetter: toProfileFile(uploaded) },
              )
            }
            onRemove={() =>
              persistFile(
                { coverLetterFileId: null },
                { coverLetter: null },
              )
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.skills.title')}</CardTitle>
          <CardDescription>{t('profile.skills.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <SkillsInput
            value={skillIds}
            onChange={(ids) =>
              setValue('skillIds', ids, { shouldDirty: true, shouldValidate: true })
            }
            initialSkills={profile?.skills}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-10 pt-6">
          <EducationTable
            items={education}
            required
            error={educationError}
            onAdd={() => setEducationModal({ open: true })}
            onEdit={(index) => setEducationModal({ open: true, index })}
            onDelete={(index) =>
              setValue(
                'education',
                education.filter((_, current) => current !== index),
                { shouldDirty: true, shouldValidate: true },
              )
            }
          />

          <ExperienceTable
            items={experience}
            onAdd={() => setExperienceModal({ open: true })}
            onEdit={(index) => setExperienceModal({ open: true, index })}
            onDelete={(index) =>
              setValue(
                'experience',
                experience.filter((_, current) => current !== index),
                { shouldDirty: true, shouldValidate: true },
              )
            }
          />

          <CertificationsTable
            items={certifications}
            skills={certificationSkills}
            onAdd={() => setCertificationModal({ open: true })}
            onEdit={(index) => setCertificationModal({ open: true, index })}
            onDelete={(index) =>
              setValue(
                'certifications',
                certifications.filter((_, current) => current !== index),
                { shouldDirty: true, shouldValidate: true },
              )
            }
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-4">
        {Object.keys(errors).length > 0 && (
          <p className="mr-auto text-sm text-destructive">
            {t('profile.validation.invalid')}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={!isDirty || updateProfile.isPending}
          onClick={() => profile && reset(toFormValues(profile))}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={() => void onSubmit()}
          disabled={updateProfile.isPending || isUploading}
        >
          {updateProfile.isPending
            ? t('profile.actions.saving')
            : t('profile.actions.save')}
        </Button>
      </div>

      <EducationModal
        open={educationModal.open}
        onClose={() => setEducationModal({ open: false })}
        onSave={saveEducation}
        initialData={editingEducation}
      />
      <ExperienceModal
        open={experienceModal.open}
        onClose={() => setExperienceModal({ open: false })}
        onSave={saveExperience}
        initialData={editingExperience}
      />
      <CertificationModal
        open={certificationModal.open}
        onClose={() => setCertificationModal({ open: false })}
        onSave={saveCertification}
        initialData={editingCertification}
        skills={certificationSkills}
      />
    </div>
  );
}
