import { Injectable } from '@nestjs/common';
import { type FilterQuery } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { ApplicationStatus } from '@common/constants/enums';
import type { IPaginatedResult } from '@common/interfaces/paginated-result.interface';
import { ApplicationSchema } from '@modules/applications/application.schema';
import {
  Candidate,
  CandidateSchema,
} from '@modules/candidates/candidate.schema';
import { CandidateSkillSchema } from '@modules/candidates/candidate-skill.schema';
import { Skill, SkillSchema } from '@modules/skills/skill.schema';
import { normalizeSkillName } from '@modules/skills/skills.service';
import { parseCandidateSort } from './candidate-sort';
import type { ListCandidatesQueryDto } from './dto/list-candidates-query.dto';

/**
 * Read-side access for the candidate directory. Search spans the candidate's
 * own columns plus the skill taxonomy; application counts are one grouped read
 * per page instead of an N+1 loop.
 */
@Injectable()
export class CandidateQueries {
  constructor(private readonly em: EntityManager) {}

  async findPage(
    query: ListCandidatesQueryDto,
  ): Promise<IPaginatedResult<Candidate>> {
    const where = await this.buildWhere(query.search);

    const [data, totalItems] = await this.em.findAndCount(
      CandidateSchema,
      where,
      {
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        orderBy: parseCandidateSort(query.sortBy),
      },
    );

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: query.limit,
        totalPages: Math.ceil(totalItems / query.limit),
        currentPage: query.page,
      },
    };
  }

  /** Non-draft application counts keyed by candidate id. */
  async countApplications(
    candidateIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (!candidateIds.length) return counts;

    const rows = await this.em.find(
      ApplicationSchema,
      {
        candidateId: { $in: candidateIds },
        status: { $ne: ApplicationStatus.DRAFT },
      },
      { fields: ['candidateId'] },
    );

    for (const row of rows) {
      counts.set(row.candidateId, (counts.get(row.candidateId) ?? 0) + 1);
    }

    return counts;
  }

  /** Skills per candidate, ordered by display name. */
  async findSkills(candidateIds: string[]): Promise<Map<string, Skill[]>> {
    const byCandidate = new Map<string, Skill[]>();
    if (!candidateIds.length) return byCandidate;

    const links = await this.em.find(CandidateSkillSchema, {
      candidateId: { $in: candidateIds },
    });
    const skillIds = [...new Set(links.map((link) => link.skillId))];
    if (!skillIds.length) return byCandidate;

    const skills = await this.em.find(
      SkillSchema,
      { id: { $in: skillIds } },
      { orderBy: { name: 'ASC' } },
    );
    const skillMap = new Map(skills.map((skill) => [skill.id, skill]));

    for (const link of links) {
      const skill = skillMap.get(link.skillId);
      if (!skill) continue;

      const list = byCandidate.get(link.candidateId) ?? [];
      list.push(skill);
      byCandidate.set(link.candidateId, list);
    }

    for (const list of byCandidate.values()) {
      list.sort((left, right) => left.name.localeCompare(right.name));
    }

    return byCandidate;
  }

  private async buildWhere(
    search: string | undefined,
  ): Promise<FilterQuery<Candidate>> {
    const term = search?.trim();
    if (!term) return {};

    const pattern = `%${term}%`;
    const normalized = normalizeSkillName(term);
    const skillRows = await this.em.find(
      SkillSchema,
      {
        $or: [
          { name: { $ilike: pattern } },
          ...(normalized
            ? [{ normalizedName: { $like: `%${normalized}%` } }]
            : []),
        ],
      },
      { fields: ['id'] },
    );

    let skillCandidateIds: string[] = [];
    if (skillRows.length) {
      const links = await this.em.find(
        CandidateSkillSchema,
        { skillId: { $in: skillRows.map((skill) => skill.id) } },
        { fields: ['candidateId'] },
      );
      skillCandidateIds = [...new Set(links.map((link) => link.candidateId))];
    }

    const or: FilterQuery<Candidate>[] = [
      { firstName: { $ilike: pattern } },
      { lastName: { $ilike: pattern } },
      { email: { $ilike: pattern } },
      { phone: { $ilike: pattern } },
    ];

    if (skillCandidateIds.length) {
      or.push({ id: { $in: skillCandidateIds } });
    }

    return { $or: or };
  }
}
