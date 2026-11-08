import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  DriverException,
  UniqueConstraintViolationException,
} from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Skill, SkillSchema } from './skill.schema';

const MAX_RESULTS = 20;

/**
 * Normalizes a skill for deduplication: lower-case and strip whitespace,
 * dots, hyphens, and underscores. Meaningful symbols (`+`, `#`, `/`) are
 * preserved so `C++`, `C#`, and `CI/CD` stay distinct.
 */
export function normalizeSkillName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s._-]+/g, '');
}

@Injectable()
export class SkillsService {
  constructor(
    @InjectRepository(SkillSchema)
    private readonly repository: EntityRepository<Skill>,
  ) {}

  async search(term: string | undefined): Promise<Skill[]> {
    const raw = term?.trim();
    if (!raw) {
      return this.repository.findAll({
        orderBy: { name: 'asc' },
        limit: MAX_RESULTS,
      });
    }

    const normalized = normalizeSkillName(raw);
    const where = normalized
      ? {
          $or: [
            { normalizedName: { $like: `%${normalized}%` } },
            { name: { $ilike: `%${raw}%` } },
          ],
        }
      : { name: { $ilike: `%${raw}%` } };

    return this.repository.find(where, {
      orderBy: { name: 'asc' },
      limit: MAX_RESULTS,
    });
  }

  /**
   * Returns the existing canonical skill when the normalized name matches,
   * otherwise creates one. A concurrent create that wins the unique index is
   * handled by re-reading the row.
   */
  async findOrCreate(
    name: string,
  ): Promise<{ skill: Skill; created: boolean }> {
    const trimmed = name.trim();
    const normalized = normalizeSkillName(trimmed);
    if (!normalized) {
      // DTO length validation normally catches this; keep the invariant here.
      throw new BadRequestException('Skill name cannot be empty');
    }

    const existing = await this.repository.findOne({
      normalizedName: normalized,
    });
    if (existing) {
      return { skill: existing, created: false };
    }

    const em = this.repository.getEntityManager();
    const skill = em.create(SkillSchema, {
      name: trimmed,
      normalizedName: normalized,
      createdAt: new Date(),
    });
    em.persist(skill);

    try {
      await em.flush();
      return { skill, created: true };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const winner = await this.repository.findOne({
        normalizedName: normalized,
      });
      if (!winner) {
        throw error;
      }
      return { skill: winner, created: false };
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (error instanceof UniqueConstraintViolationException) {
    return true;
  }
  return error instanceof DriverException && error.code === '23505';
}
