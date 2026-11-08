import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LockMode, type EntityManager } from '@mikro-orm/core';
import { EntityManager as PostgreSqlEntityManager } from '@mikro-orm/postgresql';
import { FileType } from '@common/constants/enums';
import { CandidateCertificationSchema } from '@modules/candidates/candidate-certification.schema';
import { CandidateEducationSchema } from '@modules/candidates/candidate-education.schema';
import { CandidateExperienceSchema } from '@modules/candidates/candidate-experience.schema';
import { CandidateSkillSchema } from '@modules/candidates/candidate-skill.schema';
import {
  Candidate,
  CandidateSchema,
} from '@modules/candidates/candidate.schema';
import { FilesService } from '@modules/files/files.service';
import { SkillSchema } from '@modules/skills/skill.schema';
import type {
  CertificationItemDto,
  EducationItemDto,
  ExperienceItemDto,
  UpdateProfileDto,
} from './dto/profile.dto';
import { ProfileReadService } from './profile-read.service';
import { ProfileSnapshotService } from './profile-snapshot.service';
import type { ProfileView } from './profile.types';

export interface CentralDocumentChanges {
  resumeFileId?: string | null;
  coverLetterFileId?: string | null;
}

@Injectable()
export class ProfileWriteService {
  constructor(
    private readonly em: PostgreSqlEntityManager,
    private readonly read: ProfileReadService,
    private readonly snapshots: ProfileSnapshotService,
    private readonly files: FilesService,
  ) {}

  async updateProfile(
    candidateId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileView> {
    await this.validateFiles(candidateId, dto);

    return this.em.transactional(async (em) => {
      await this.lockCandidate(em, candidateId);
      const before = await this.read.getLiveProfile(candidateId, em);
      await this.snapshots.createAndRepoint(em, candidateId, before);
      await this.applyUpdate(em, candidateId, dto);
      return this.read.getLiveProfile(candidateId, em);
    });
  }

  /**
   * Used by the apply flow when the candidate asks to replace the central
   * resume/cover letter. The application being submitted is excluded from the
   * repoint so it keeps pointing at live data after the update.
   */
  async updateCentralDocuments(
    candidateId: string,
    changes: CentralDocumentChanges,
    options: { excludeApplicationId?: string; em?: EntityManager } = {},
  ): Promise<ProfileView> {
    await this.validateFiles(candidateId, changes);

    if (options.em) {
      return this.applyCentralDocuments(
        options.em,
        candidateId,
        changes,
        options.excludeApplicationId,
      );
    }

    return this.em.transactional((em) =>
      this.applyCentralDocuments(
        em,
        candidateId,
        changes,
        options.excludeApplicationId,
      ),
    );
  }

  private async applyCentralDocuments(
    em: EntityManager,
    candidateId: string,
    changes: CentralDocumentChanges,
    excludeApplicationId?: string,
  ): Promise<ProfileView> {
    await this.lockCandidate(em, candidateId);
    const before = await this.read.getLiveProfile(candidateId, em);
    await this.snapshots.createAndRepoint(
      em,
      candidateId,
      before,
      excludeApplicationId,
    );

    const candidate = await this.getCandidate(em, candidateId);
    if (changes.resumeFileId !== undefined) {
      candidate.resumeFileId = changes.resumeFileId;
    }
    if (changes.coverLetterFileId !== undefined) {
      candidate.coverLetterFileId = changes.coverLetterFileId;
    }
    candidate.updatedAt = new Date();
    await em.flush();

    return this.read.getLiveProfile(candidateId, em);
  }

  private async applyUpdate(
    em: EntityManager,
    candidateId: string,
    dto: UpdateProfileDto,
  ): Promise<void> {
    const candidate = await this.getCandidate(em, candidateId);

    assignScalars(candidate, dto);

    if (dto.profileImageFileId !== undefined) {
      candidate.profileImageFileId = dto.profileImageFileId ?? null;
    }
    if (dto.resumeFileId !== undefined) {
      candidate.resumeFileId = dto.resumeFileId ?? null;
    }
    if (dto.coverLetterFileId !== undefined) {
      candidate.coverLetterFileId = dto.coverLetterFileId ?? null;
    }

    if (dto.education !== undefined) {
      await this.syncEducation(em, candidateId, dto.education);
    }
    if (dto.experience !== undefined) {
      await this.syncExperience(em, candidateId, dto.experience);
    }
    if (dto.skillIds !== undefined) {
      await this.syncSkills(em, candidateId, dto.skillIds);
    }
    if (dto.certifications !== undefined) {
      await this.syncCertifications(em, candidateId, dto.certifications);
    }

    // Immediate file-only updates are allowed before the profile is complete.
    // Full saves enforce the profile contract. Detect this from the payload
    // itself rather than trusting the client flag, so an older client (or a
    // flag stripped in transit) still saves uploads immediately, while a
    // request that changes any profile field is always fully validated.
    const isPartialFileUpdate = isFileOnlyUpdate(dto);
    if (!isPartialFileUpdate) {
      if (!candidate.firstName?.trim() || !candidate.lastName?.trim()) {
        throw new BadRequestException('First name and last name are required');
      }
      if (!candidate.profileImageFileId) {
        throw new BadRequestException('A profile photo is required');
      }
      if (!candidate.resumeFileId) {
        throw new BadRequestException('A central resume is required');
      }

      const educationCount =
        dto.education !== undefined
          ? dto.education.length
          : await em.count(CandidateEducationSchema, { candidateId });
      if (educationCount === 0) {
        throw new BadRequestException(
          'At least one education entry is required',
        );
      }
    }

    candidate.updatedAt = new Date();
    await em.flush();
  }

  private async syncEducation(
    em: EntityManager,
    candidateId: string,
    items: EducationItemDto[],
  ): Promise<void> {
    const existing = await em.find(CandidateEducationSchema, { candidateId });
    const byId = new Map(existing.map((row) => [row.id, row]));
    const keep = new Set<string>();

    for (const item of items) {
      assertDateRange(item.startDate, item.endDate ?? null, 'education');
      const gpa =
        item.gpa === undefined || item.gpa === null ? null : String(item.gpa);

      if (item.id) {
        const row = byId.get(item.id);
        if (!row) {
          throw new BadRequestException('Education entry not found');
        }
        row.institution = item.institution;
        row.degree = item.degree;
        row.fieldOfStudy = item.fieldOfStudy;
        row.startDate = item.startDate;
        row.endDate = item.endDate ?? null;
        row.grade = item.grade ?? null;
        row.gpa = gpa;
        row.additionalDetails = item.additionalDetails ?? null;
        row.updatedAt = new Date();
        keep.add(row.id);
        continue;
      }

      const row = em.create(CandidateEducationSchema, {
        candidateId,
        institution: item.institution,
        degree: item.degree,
        fieldOfStudy: item.fieldOfStudy,
        startDate: item.startDate,
        endDate: item.endDate ?? null,
        grade: item.grade ?? null,
        gpa,
        additionalDetails: item.additionalDetails ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      em.persist(row);
      keep.add(row.id);
    }

    for (const row of existing) {
      if (!keep.has(row.id)) {
        em.remove(row);
      }
    }
  }

  private async syncExperience(
    em: EntityManager,
    candidateId: string,
    items: ExperienceItemDto[],
  ): Promise<void> {
    const existing = await em.find(CandidateExperienceSchema, { candidateId });
    const byId = new Map(existing.map((row) => [row.id, row]));
    const keep = new Set<string>();

    for (const item of items) {
      assertDateRange(item.startDate, item.endDate ?? null, 'experience');

      if (item.id) {
        const row = byId.get(item.id);
        if (!row) {
          throw new BadRequestException('Experience entry not found');
        }
        row.companyName = item.companyName;
        row.jobTitle = item.jobTitle;
        row.startDate = item.startDate;
        row.endDate = item.endDate ?? null;
        row.salary = item.salary ?? null;
        row.description = item.description ?? null;
        row.updatedAt = new Date();
        keep.add(row.id);
        continue;
      }

      const row = em.create(CandidateExperienceSchema, {
        candidateId,
        companyName: item.companyName,
        jobTitle: item.jobTitle,
        startDate: item.startDate,
        endDate: item.endDate ?? null,
        salary: item.salary ?? null,
        description: item.description ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      em.persist(row);
      keep.add(row.id);
    }

    for (const row of existing) {
      if (!keep.has(row.id)) {
        em.remove(row);
      }
    }
  }

  private async syncSkills(
    em: EntityManager,
    candidateId: string,
    skillIds: string[],
  ): Promise<void> {
    const uniqueIds = [...new Set(skillIds)];
    await this.assertSkillsExist(em, uniqueIds);

    await em.nativeDelete(CandidateSkillSchema, { candidateId });
    for (const skillId of uniqueIds) {
      em.persist(
        em.create(CandidateSkillSchema, {
          candidateId,
          skillId,
          createdAt: new Date(),
        }),
      );
    }
  }

  private async syncCertifications(
    em: EntityManager,
    candidateId: string,
    items: CertificationItemDto[],
  ): Promise<void> {
    const existing = await em.find(CandidateCertificationSchema, {
      candidateId,
    });
    const byId = new Map(existing.map((row) => [row.id, row]));
    const keep = new Set<string>();

    const skillIds = [
      ...new Set(
        items
          .map((item) => item.skillId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    await this.assertSkillsExist(em, skillIds);

    for (const item of items) {
      if (!item.credentialUrl && !item.fileId) {
        throw new BadRequestException(
          'A certification needs a credential URL or a soft copy',
        );
      }
      assertDateRange(
        item.issueDate ?? null,
        item.expiryDate ?? null,
        'certification',
      );

      if (item.id) {
        const row = byId.get(item.id);
        if (!row) {
          throw new BadRequestException('Certification entry not found');
        }
        row.title = item.title;
        row.issuer = item.issuer ?? null;
        row.skillId = item.skillId ?? null;
        row.credentialUrl = item.credentialUrl ?? null;
        row.fileId = item.fileId ?? null;
        row.issueDate = item.issueDate ?? null;
        row.expiryDate = item.expiryDate ?? null;
        row.updatedAt = new Date();
        keep.add(row.id);
        continue;
      }

      const row = em.create(CandidateCertificationSchema, {
        candidateId,
        title: item.title,
        issuer: item.issuer ?? null,
        skillId: item.skillId ?? null,
        credentialUrl: item.credentialUrl ?? null,
        fileId: item.fileId ?? null,
        issueDate: item.issueDate ?? null,
        expiryDate: item.expiryDate ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      em.persist(row);
      keep.add(row.id);
    }

    for (const row of existing) {
      if (!keep.has(row.id)) {
        em.remove(row);
      }
    }
  }

  private async assertSkillsExist(
    em: EntityManager,
    skillIds: string[],
  ): Promise<void> {
    if (!skillIds.length) {
      return;
    }
    const skills = await em.find(SkillSchema, { id: { $in: skillIds } });
    if (skills.length !== skillIds.length) {
      throw new BadRequestException('One or more skills do not exist');
    }
  }

  private async validateFiles(
    candidateId: string,
    dto: {
      profileImageFileId?: string | null;
      resumeFileId?: string | null;
      coverLetterFileId?: string | null;
      certifications?: CertificationItemDto[];
    },
  ): Promise<void> {
    if (dto.profileImageFileId) {
      await this.files.findCandidateFile(
        dto.profileImageFileId,
        candidateId,
        FileType.PROFILE_IMAGE,
      );
    }
    if (dto.resumeFileId) {
      await this.files.findCandidateFile(
        dto.resumeFileId,
        candidateId,
        FileType.RESUME,
      );
    }
    if (dto.coverLetterFileId) {
      await this.files.findCandidateFile(
        dto.coverLetterFileId,
        candidateId,
        FileType.COVER_LETTER,
      );
    }
    for (const certification of dto.certifications ?? []) {
      if (certification.fileId) {
        await this.files.findCandidateFile(
          certification.fileId,
          candidateId,
          FileType.CERTIFICATION,
        );
      }
    }
  }

  private async lockCandidate(
    em: EntityManager,
    candidateId: string,
  ): Promise<Candidate> {
    const candidate = await em.findOne(
      CandidateSchema,
      { id: candidateId },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }
    return candidate;
  }

  private async getCandidate(
    em: EntityManager,
    candidateId: string,
  ): Promise<Candidate> {
    const candidate = await em.findOne(CandidateSchema, { id: candidateId });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }
    return candidate;
  }
}

function isFileOnlyUpdate(dto: UpdateProfileDto): boolean {
  const hasFileChange =
    dto.profileImageFileId !== undefined ||
    dto.resumeFileId !== undefined ||
    dto.coverLetterFileId !== undefined;

  return (
    hasFileChange &&
    dto.firstName === undefined &&
    dto.lastName === undefined &&
    dto.phone === undefined &&
    dto.currentLocation === undefined &&
    dto.address === undefined &&
    dto.city === undefined &&
    dto.state === undefined &&
    dto.country === undefined &&
    dto.postalCode === undefined &&
    dto.linkedinUrl === undefined &&
    dto.portfolioUrl === undefined &&
    dto.education === undefined &&
    dto.experience === undefined &&
    dto.skillIds === undefined &&
    dto.certifications === undefined
  );
}

function assignScalars(candidate: Candidate, dto: UpdateProfileDto): void {
  if (dto.firstName !== undefined) candidate.firstName = dto.firstName;
  if (dto.lastName !== undefined) candidate.lastName = dto.lastName;
  if (dto.phone !== undefined) candidate.phone = dto.phone ?? null;
  if (dto.currentLocation !== undefined) {
    candidate.currentLocation = dto.currentLocation;
  }
  if (dto.address !== undefined) candidate.address = dto.address;
  if (dto.city !== undefined) candidate.city = dto.city;
  if (dto.state !== undefined) candidate.state = dto.state;
  if (dto.country !== undefined) candidate.country = dto.country;
  if (dto.postalCode !== undefined) candidate.postalCode = dto.postalCode;
  if (dto.linkedinUrl !== undefined) {
    candidate.linkedinUrl = dto.linkedinUrl ?? null;
  }
  if (dto.portfolioUrl !== undefined) {
    candidate.portfolioUrl = dto.portfolioUrl ?? null;
  }
}

function assertDateRange(
  start: string | null,
  end: string | null,
  label: string,
): void {
  if (start && end && end < start) {
    throw new BadRequestException(
      `The ${label} end date cannot be before the start date`,
    );
  }
}
