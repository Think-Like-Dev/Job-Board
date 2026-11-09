import type { CandidateFormValues } from "@/api/schemas/candidates.schema";

export interface CandidateUploads {
  resumeFile: File;
  profileImageFile?: File | null;
}

function clean(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseGpa(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

/**
 * Multipart body for `POST /candidates`. Optional strings are omitted instead
 * of sent empty so backend DTO validation can rely on absence, and the nested
 * arrays travel as JSON strings parsed by `parseJsonField`.
 */
export function buildCandidateFormData(
  values: CandidateFormValues,
  uploads: CandidateUploads,
): FormData {
  const formData = new FormData();

  formData.append("firstName", values.firstName.trim());
  formData.append("lastName", values.lastName.trim());
  formData.append("email", values.email.trim().toLowerCase());

  const optional = compact({
    phone: clean(values.phone),
    currentLocation: clean(values.currentLocation),
    address: clean(values.address),
    city: clean(values.city),
    state: clean(values.state),
    country: clean(values.country),
    postalCode: clean(values.postalCode),
    linkedinUrl: clean(values.linkedinUrl),
    portfolioUrl: clean(values.portfolioUrl),
  });

  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined) formData.append(key, String(value));
  }

  const skills = values.skills
    .map((skill) => skill.trim())
    .filter((skill, index, list) => skill && list.indexOf(skill) === index);

  const education = values.education.map((item) =>
    compact({
      institution: item.institution.trim(),
      degree: item.degree.trim(),
      fieldOfStudy: item.fieldOfStudy.trim(),
      startDate: item.startDate,
      endDate: clean(item.endDate),
      grade: clean(item.grade),
      gpa: parseGpa(item.gpa),
      additionalDetails: clean(item.additionalDetails),
    }),
  );

  const experience = values.experience.map((item) =>
    compact({
      companyName: item.companyName.trim(),
      jobTitle: item.jobTitle.trim(),
      startDate: item.startDate,
      endDate: clean(item.endDate),
      salary: clean(item.salary),
      description: clean(item.description),
    }),
  );

  const certifications = values.certifications.map((item) =>
    compact({
      title: item.title.trim(),
      issuer: clean(item.issuer),
      credentialUrl: item.credentialUrl.trim(),
      issueDate: clean(item.issueDate),
      expiryDate: clean(item.expiryDate),
    }),
  );

  formData.append("skills", JSON.stringify(skills));
  formData.append("education", JSON.stringify(education));
  formData.append("experience", JSON.stringify(experience));
  formData.append("certifications", JSON.stringify(certifications));

  formData.append("resumeFile", uploads.resumeFile);
  if (uploads.profileImageFile) {
    formData.append("profileImageFile", uploads.profileImageFile);
  }

  return formData;
}
