import type { Candidate } from '@modules/candidates/candidate.schema';
import type { ExperienceCalculation } from '@modules/candidates/experience/experience-calculator';
import { toProfileDto } from '@modules/profiles/profile.presenter';
import type { ProfileView } from '@modules/profiles/profile.types';
import type { Skill } from '@modules/skills/skill.schema';
import type {
  CandidateDetailDto,
  CandidateListItemDto,
} from './dto/candidate-response.dto';

export function toCandidateListItemDto(
  candidate: Candidate,
  skills: Skill[],
  totalApplicationsCount: number,
): CandidateListItemDto {
  return {
    id: candidate.id,
    firstName: candidate.firstName ?? null,
    lastName: candidate.lastName ?? null,
    email: candidate.email,
    phone: candidate.phone ?? null,
    currentLocation: candidate.currentLocation ?? null,
    skills: skills.map((skill) => ({ id: skill.id, name: skill.name })),
    totalExperienceMonths: candidate.totalExperienceMonths ?? 0,
    totalApplicationsCount,
    createdAt: candidate.createdAt?.toISOString() ?? null,
    resumeFileId: candidate.resumeFileId ?? null,
    profileImageFileId: candidate.profileImageFileId ?? null,
    createdBy: candidate.createdBy ?? null,
  };
}

export function toCandidateDetailDto(
  candidate: Candidate,
  profile: ProfileView,
  calculation: ExperienceCalculation,
): CandidateDetailDto {
  return {
    ...toProfileDto(profile),
    createdAt: candidate.createdAt?.toISOString() ?? null,
    createdBy: candidate.createdBy ?? null,
    totalExperienceMonths: calculation.totalMonths,
    careerStartDate: calculation.careerStartDate,
    gaps: calculation.gaps,
  };
}
