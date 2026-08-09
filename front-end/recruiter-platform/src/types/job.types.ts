export enum JobStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
  ARCHIVED = "ARCHIVED",
  CLOSED = "CLOSED",
}

export enum EmploymentType {
  FULL_TIME = "FULL_TIME",
  PART_TIME = "PART_TIME",
  CONTRACT = "CONTRACT",
  INTERN = "INTERN",
}

export enum Currency {
  USD = "$ USD",
  INR = "₹ INR",
  EUR = "€ EUR",
  AED_DIRH = "د.إ AED (UAE)"
}

export enum WorkMode {
  ON_SITE = "ON_SITE",
  HYBRID = "HYBRID",
  REMOTE = "REMOTE",
}

export const JobStatusArray = Object.values(JobStatus);
type CompensationBase = {
  currency: Currency;
  period: "Yearly" | "Monthly" | "Hourly";
};

export enum CompensationType { FIXED = "FIXED" , RANGE = "RANGE" , NEGOTIABLE = "NEGOTIABLE" };

export type Compensation =
  | (CompensationBase & {amount: number} & {
      type: CompensationType.FIXED;
    })
  | (CompensationBase & {
      type: CompensationType.RANGE;
      amount: [number, number];
    })
  | (Partial<CompensationBase> & {amount?:number} & {
      type: CompensationType.NEGOTIABLE;
    })
  | null;
export interface Job {
  id: number;
  code: string;
  title: string;
  category: string;
  description: string;
  yearsOfExperience: string;
  employmentType: EmploymentType;
  compensation?: Compensation;
  location: string;
  modeOfWork: WorkMode[];
  workShiftTiming: string[];
  skills: string[];
  keywords: string[];
  responsibilities: string;
  vacancies: number;
  status: JobStatus;
  applicationSettings?: {
    coverLetterRequired: boolean;
    attachmentsAllowed: boolean;
    maximumAttachments: number;
    customQuestions?: object[];
  };
  hiringProcess?: string[];
  autoClosingDate?: string;
  createdAt: string;
  updatedAt: string;
}