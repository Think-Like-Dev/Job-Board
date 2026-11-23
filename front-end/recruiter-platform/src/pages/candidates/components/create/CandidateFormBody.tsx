import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";

import type { CandidateFormValues } from "@/api/schemas/candidates.schema";
import {
  validateProfileImageFile,
  validateResumeFile,
} from "@/lib/candidateFileValidation";
import { BasicsSection } from "./BasicsSection";
import { CertificationsSection } from "./CertificationsSection";
import { EducationSection } from "./EducationSection";
import { ExperienceSection } from "./ExperienceSection";
import { FileField } from "./FileField";
import { FormSection } from "./FormSection";
import { LinksSection } from "./LinksSection";
import { LocationSection } from "./LocationSection";
import { SkillsSection } from "./SkillsSection";

interface CandidateFormBodyProps {
  form: UseFormReturn<CandidateFormValues>;
  resumeFile: File | null;
  profileImageFile: File | null;
  resumeError?: string;
  onResumeChange: (file: File | null) => void;
  onProfileImageChange: (file: File | null) => void;
}

/** All create-candidate form groups, shared by the dialog and mobile sheet. */
export function CandidateFormBody({
  form,
  resumeFile,
  profileImageFile,
  resumeError,
  onResumeChange,
  onProfileImageChange,
}: CandidateFormBodyProps) {
  const { t } = useTranslation();

  const fileMessages = {
    tooLarge: t("candidate.form.validation.tooLarge"),
    invalidType: t("candidate.form.validation.invalidType"),
    removeFile: t("candidate.form.removeFile"),
  };

  return (
    <div className="space-y-3">
      <FormSection title={t("candidate.form.sections.basics")}>
        <BasicsSection form={form} />
      </FormSection>

      <FormSection title={t("candidate.form.sections.documents")}>
        <FileField
          id="resumeFile"
          label={t("candidate.form.fields.resume")}
          hint={t("candidate.form.resumeHint")}
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          file={resumeFile}
          error={resumeError}
          validate={validateResumeFile}
          messages={fileMessages}
          onSelect={onResumeChange}
        />
        <FileField
          id="profileImageFile"
          label={t("candidate.form.fields.profileImage")}
          hint={t("candidate.form.profileImageHint")}
          accept=".jpg,.jpeg,.jfif,.png,.webp,image/jpeg,image/png,image/webp"
          file={profileImageFile}
          validate={validateProfileImageFile}
          messages={fileMessages}
          onSelect={onProfileImageChange}
        />
      </FormSection>

      <FormSection
        title={t("candidate.form.sections.location")}
        defaultOpen={false}
      >
        <LocationSection form={form} />
      </FormSection>

      <FormSection
        title={t("candidate.form.sections.links")}
        defaultOpen={false}
      >
        <LinksSection form={form} />
      </FormSection>

      <FormSection
        title={t("candidate.form.sections.skills")}
        defaultOpen={false}
      >
        <SkillsSection form={form} />
      </FormSection>

      <FormSection
        title={t("candidate.form.sections.education")}
        defaultOpen={false}
      >
        <EducationSection form={form} />
      </FormSection>

      <FormSection
        title={t("candidate.form.sections.experience")}
        defaultOpen={false}
      >
        <ExperienceSection form={form} />
      </FormSection>

      <FormSection
        title={t("candidate.form.sections.certifications")}
        defaultOpen={false}
      >
        <CertificationsSection form={form} />
      </FormSection>
    </div>
  );
}
