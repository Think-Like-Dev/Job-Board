import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'node:crypto';
import { FileType } from '@common/constants/enums';
import type { SessionPayload } from '@modules/auth/auth.service';
import { CandidateCertificationSchema } from '@modules/candidates/candidate-certification.schema';
import { CandidateEducationSchema } from '@modules/candidates/candidate-education.schema';
import { CandidateExperienceSchema } from '@modules/candidates/candidate-experience.schema';
import { CandidateSkillSchema } from '@modules/candidates/candidate-skill.schema';
import { CandidateSchema } from '@modules/candidates/candidate.schema';
import { CandidatesService } from '@modules/candidates/candidates.service';
import { calculateExperience } from '@modules/candidates/experience/experience-calculator';
import { FilesService } from '@modules/files/files.service';
import { SkillsService } from '@modules/skills/skills.service';
import { CandidateDetailService } from './candidate-detail.service';
import type { CandidateDetailDto } from './dto/candidate-response.dto';
import type { CreateCandidateDto } from './dto/create-candidate.dto';

export interface CandidateCreateUploads {
  resumeFile?: Express.Multer.File;
  profileImageFile?: Express.Multer.File;
}

/**
 * Manual recruiter candidate creation. The resume is mandatory and is stored
 * as a candidate-owned file; the candidate row may not exist yet, so the UUID
 * is generated before the storage upload and reused for the insert.
 */
@Injectable()
export class CandidateCreateService {
  constructor(
    private readonly em: EntityManager,
    private readonly candidates: CandidatesService,
    private readonly files: FilesService,
    private readonly skills: SkillsService,
    private readonly detail: CandidateDetailService,
  ) {}

  async create(
    dto: CreateCandidateDto,
    uploads: CandidateCreateUploads,
    session: SessionPayload,
  ): Promise<CandidateDetailDto> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.candidates.findByEmail(email);
    if (existing) {
      throw new ConflictException('A candidate with this email already exists');
    }

    if (!uploads.resumeFile) {
      throw new BadRequestException('A resume file is required');
    }

    this.assertDateRanges(dto);

    const candidateId = randomUUID();
    const createdFileIds: string[] = [];

    try {
      const resume = await this.files.registerAndUploadForCandidate(
        uploads.resumeFile,
        FileType.RESUME,
        candidateId,
      );
      createdFileIds.push(resume.id);

      const profileImage = uploads.profileImageFile
        ? await this.files.registerAndUploadForCandidate(
            uploads.profileImageFile,
            FileType.PROFILE_IMAGE,
            candidateId,
          )
        : null;
      if (profileImage) createdFileIds.push(profileImage.id);

      const skillIds = await this.resolveSkills(dto.skills);
      const calculation = calculateExperience(
        dto.experience ?? [],
        dto.education ?? [],
      );

      await this.em.transactional((em) => {
        const now = new Date();

        const candidate = em.create(CandidateSchema, {
          id: candidateId,
          email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone ?? null,
          currentLocation: dto.currentLocation ?? null,
          address: dto.address ?? null,
          city: dto.city ?? null,
          state: dto.state ?? null,
          country: dto.country ?? null,
          postalCode: dto.postalCode ?? null,
          linkedinUrl: dto.linkedinUrl ?? null,
          portfolioUrl: dto.portfolioUrl ?? null,
          profileImageFileId: profileImage?.id ?? null,
          resumeFileId: resume.id,
          createdBy: session.principalId,
          totalExperienceMonths: calculation.totalMonths,
          createdAt: now,
          updatedAt: now,
        });
        em.persist(candidate);

        for (const skillId of skillIds) {
          em.persist(
            em.create(CandidateSkillSchema, {
              candidateId,
              skillId,
              createdAt: now,
            }),
          );
        }

        for (const item of dto.education ?? []) {
          em.persist(
            em.create(CandidateEducationSchema, {
              candidateId,
              institution: item.institution,
              degree: item.degree,
              fieldOfStudy: item.fieldOfStudy,
              startDate: item.startDate,
              endDate: item.endDate ?? null,
              grade: item.grade ?? null,
              gpa:
                item.gpa === undefined || item.gpa === null
                  ? null
                  : String(item.gpa),
              additionalDetails: item.additionalDetails ?? null,
              createdAt: now,
              updatedAt: now,
            }),
          );
        }

        for (const item of dto.experience ?? []) {
          em.persist(
            em.create(CandidateExperienceSchema, {
              candidateId,
              companyName: item.companyName,
              jobTitle: item.jobTitle,
              startDate: item.startDate,
              endDate: item.endDate ?? null,
              salary: item.salary ?? null,
              description: item.description ?? null,
              createdAt: now,
              updatedAt: now,
            }),
          );
        }

        for (const item of dto.certifications ?? []) {
          em.persist(
            em.create(CandidateCertificationSchema, {
              candidateId,
              title: item.title,
              issuer: item.issuer ?? null,
              skillId: item.skillId ?? null,
              credentialUrl: item.credentialUrl,
              fileId: null,
              issueDate: item.issueDate ?? null,
              expiryDate: item.expiryDate ?? null,
              createdAt: now,
              updatedAt: now,
            }),
          );
        }
      });

      return await this.detail.get(candidateId);
    } catch (error) {
      for (const fileId of createdFileIds) {
        await this.files.removeIfUnreferenced(fileId).catch(() => undefined);
      }

      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'A candidate with this email already exists',
        );
      }

      throw error;
    }
  }

  private async resolveSkills(names?: string[]): Promise<string[]> {
    if (!names?.length) return [];

    const uniqueNames = [
      ...new Set(names.map((name) => name.trim()).filter(Boolean)),
    ];
    const skillIds: string[] = [];

    for (const name of uniqueNames) {
      const { skill } = await this.skills.findOrCreate(name);
      skillIds.push(skill.id);
    }

    return skillIds;
  }

  private assertDateRanges(dto: CreateCandidateDto): void {
    for (const item of dto.education ?? []) {
      assertEndAfterStart(item.startDate, item.endDate ?? null, 'education');
    }
    for (const item of dto.experience ?? []) {
      assertEndAfterStart(item.startDate, item.endDate ?? null, 'experience');
    }
    for (const item of dto.certifications ?? []) {
      assertEndAfterStart(
        item.issueDate ?? null,
        item.expiryDate ?? null,
        'certification',
      );
    }
  }
}

function assertEndAfterStart(
  start: string | null | undefined,
  end: string | null | undefined,
  label: string,
): void {
  if (!start || !end) return;

  if (new Date(`${end}T00:00:00Z`) < new Date(`${start}T00:00:00Z`)) {
    throw new BadRequestException(
      `The ${label} end date cannot be before its start date`,
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (error instanceof UniqueConstraintViolationException) return true;
  return (error as { code?: string } | null)?.code === '23505';
}
