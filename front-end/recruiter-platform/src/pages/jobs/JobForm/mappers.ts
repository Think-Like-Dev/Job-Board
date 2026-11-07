import type { JobDetail, JobFormValues } from "@/api/schemas/jobs.schema";

/** Maps a persisted job detail into the wizard's form shape. */
export function jobDetailToFormValues(job: JobDetail): JobFormValues {
  return {
    title: job.title,
    department: job.department ?? "",
    designation: job.designation ?? "",
    category: job.category,
    employmentType: job.employmentType,
    location: job.location,
    workMode: job.workMode ?? [],
    description: job.description,
    responsibilities: job.responsibilities ?? "",
    yearsOfExperience: job.yearsOfExperience ?? "",
    skills: job.skills ?? [],
    keywords: job.keywords ?? [],
    compensation: job.compensation ?? null,
    vacancies: job.vacancies ?? 1,
    benefits: job.benefits ?? [],
    workShiftTiming: job.workShiftTiming ?? [],
    totalInterviewRounds: job.totalInterviewRounds ?? 1,
    lastApplicationDate: job.lastApplicationDate ?? "",
    applicationSettings: {
      coverLetterRequired:
        job.applicationSettings?.coverLetterRequired ?? false,
      attachmentsAllowed: job.applicationSettings?.attachmentsAllowed ?? false,
      maximumAttachments: job.applicationSettings?.maximumAttachments ?? 1,
    },
  };
}

/**
 * Maps a job into wizard values for cloning. The title and content are kept,
 * but a closing date that has already passed is cleared so the copy can be
 * published without re-dating it first.
 */
export function jobDetailToCloneFormValues(job: JobDetail): JobFormValues {
  const values = jobDetailToFormValues(job);
  const today = new Date().toISOString().slice(0, 10);

  if (values.lastApplicationDate && values.lastApplicationDate < today) {
    values.lastApplicationDate = "";
  }

  return values;
}
