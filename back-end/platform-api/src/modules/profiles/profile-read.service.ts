import { Injectable, NotFoundException } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { EntityManager as PostgreSqlEntityManager } from '@mikro-orm/postgresql';
import { CandidateCertificationSchema } from '@modules/candidates/candidate-certification.schema';
import { CandidateEducationSchema } from '@modules/candidates/candidate-education.schema';
import { CandidateExperienceSchema } from '@modules/candidates/candidate-experience.schema';
import { CandidateProfileVersionSchema } from '@modules/candidates/candidate-profile-version.schema';
import { CandidateSkillSchema } from '@modules/candidates/candidate-skill.schema';
import { CandidateSchema } from '@modules/candidates/candidate.schema';
import { FileSchema } from '@modules/files/file.schema';
import { SkillSchema } from '@modules/skills/skill.schema';
import type {
  CertificationView,
  EducationView,
  ExperienceView,
  FileView,
  ProfileView,
  SkillView,
} from './profile.types';

const FILE_CONTENT_BASE = '/files';

@Injectable()
export class ProfileReadService {
  constructor(private readonly em: PostgreSqlEntityManager) {}

  async getLiveProfile(
    candidateId: string,
    em: EntityManager = this.em,
  ): Promise<ProfileView> {
    const candidate = await em.findOne(CandidateSchema, { id: candidateId });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const [education, experience, skillLinks, certifications] =
      await Promise.all([
        em.find(
          CandidateEducationSchema,
          { candidateId },
          { orderBy: { startDate: 'desc' } },
        ),
        em.find(
          CandidateExperienceSchema,
          { candidateId },
          { orderBy: { startDate: 'desc' } },
        ),
        em.find(CandidateSkillSchema, { candidateId }),
        em.find(
          CandidateCertificationSchema,
          { candidateId },
          { orderBy: { issueDate: 'desc' } },
        ),
      ]);

    const skillIds = [
      ...new Set([
        ...skillLinks.map((row) => row.skillId),
        ...certifications
          .map((row) => row.skillId)
          .filter((id): id is string => Boolean(id)),
      ]),
    ];
    const skills = skillIds.length
      ? await em.find(SkillSchema, { id: { $in: skillIds } })
      : [];
    const skillMap = new Map(skills.map((skill) => [skill.id, skill]));

    const fileIds = [
      ...new Set(
        [
          candidate.profileImageFileId,
          candidate.resumeFileId,
          candidate.coverLetterFileId,
          ...certifications.map((row) => row.fileId),
        ].filter((id): id is string => Boolean(id)),
      ),
    ];
    const files = fileIds.length
      ? await em.find(FileSchema, { id: { $in: fileIds } })
      : [];
    const fileMap = new Map(files.map((file) => [file.id, toFileView(file)]));

    const skillViews: SkillView[] = skillLinks
      .map((row) => skillMap.get(row.skillId))
      .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill))
      .map((skill) => ({ id: skill.id, name: skill.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const certificationViews: CertificationView[] = certifications.map(
      (row) => {
        const skill = row.skillId ? skillMap.get(row.skillId) : undefined;
        const file = row.fileId ? fileMap.get(row.fileId) : undefined;
        return {
          id: row.id,
          title: row.title,
          issuer: row.issuer ?? null,
          skillId: row.skillId ?? null,
          skillName: skill?.name ?? null,
          credentialUrl: row.credentialUrl ?? null,
          fileId: row.fileId ?? null,
          fileName: file?.filename ?? null,
          fileUrl: file?.url ?? null,
          issueDate: toDateOnly(row.issueDate),
          expiryDate: toDateOnly(row.expiryDate),
        };
      },
    );

    return {
      id: candidate.id,
      email: candidate.email,
      firstName: candidate.firstName ?? null,
      lastName: candidate.lastName ?? null,
      phone: candidate.phone ?? null,
      currentLocation: candidate.currentLocation ?? null,
      address: candidate.address ?? null,
      city: candidate.city ?? null,
      state: candidate.state ?? null,
      country: candidate.country ?? null,
      postalCode: candidate.postalCode ?? null,
      linkedinUrl: candidate.linkedinUrl ?? null,
      portfolioUrl: candidate.portfolioUrl ?? null,
      profileImage: candidate.profileImageFileId
        ? (fileMap.get(candidate.profileImageFileId) ?? null)
        : null,
      resume: candidate.resumeFileId
        ? (fileMap.get(candidate.resumeFileId) ?? null)
        : null,
      coverLetter: candidate.coverLetterFileId
        ? (fileMap.get(candidate.coverLetterFileId) ?? null)
        : null,
      education: education.map(toEducationView),
      experience: experience.map(toExperienceView),
      skills: skillViews,
      certifications: certificationViews,
    };
  }

  async getApplicationProfile(application: {
    candidateId: string;
    profileVersionId?: string | null;
  }): Promise<ProfileView> {
    if (!application.profileVersionId) {
      return this.getLiveProfile(application.candidateId);
    }

    const version = await this.em.findOne(CandidateProfileVersionSchema, {
      id: application.profileVersionId,
    });
    if (!version) {
      throw new NotFoundException('Profile snapshot not found');
    }

    const data = version.profileData as unknown as ProfileView;
    return {
      ...data,
      versionNumber: version.versionNumber,
      capturedAt: version.createdAt?.toISOString(),
    };
  }

  async getProfileVersion(id: string) {
    return this.em.findOne(CandidateProfileVersionSchema, { id });
  }
}

function toFileView(file: {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  size?: number | bigint | null;
}): FileView {
  const url = `${FILE_CONTENT_BASE}/${file.id}/content`;
  return {
    id: file.id,
    filename: file.filename ?? null,
    mimeType: file.mimeType ?? null,
    size:
      file.size === undefined || file.size === null ? null : Number(file.size),
    url,
    downloadUrl: `${url}?download=true`,
  };
}

/** PostgreSQL `date` columns can hydrate as strings or Date objects. */
function toDateOnly(value?: string | Date | null): string | null {
  if (value === undefined || value === null || value === '') return null;
  const text = value instanceof Date ? value.toISOString() : String(value);
  return text.slice(0, 10);
}

function toEducationView(row: {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  grade?: string | null;
  gpa?: string | null;
  additionalDetails?: string | null;
}): EducationView {
  return {
    id: row.id,
    institution: row.institution,
    degree: row.degree,
    fieldOfStudy: row.fieldOfStudy,
    startDate: toDateOnly(row.startDate) ?? '',
    endDate: toDateOnly(row.endDate),
    grade: row.grade ?? null,
    gpa: row.gpa ?? null,
    additionalDetails: row.additionalDetails ?? null,
  };
}

function toExperienceView(row: {
  id: string;
  companyName: string;
  jobTitle: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  salary?: string | null;
  description?: string | null;
}): ExperienceView {
  return {
    id: row.id,
    companyName: row.companyName,
    jobTitle: row.jobTitle,
    startDate: toDateOnly(row.startDate) ?? '',
    endDate: toDateOnly(row.endDate),
    salary: row.salary ?? null,
    description: row.description ?? null,
  };
}
