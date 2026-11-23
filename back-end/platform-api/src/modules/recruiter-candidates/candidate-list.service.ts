import { Injectable } from '@nestjs/common';
import type { IPaginatedResult } from '@common/interfaces/paginated-result.interface';
import { CandidateQueries } from './candidate-queries';
import { toCandidateListItemDto } from './candidate.presenter';
import type { CandidateListItemDto } from './dto/candidate-response.dto';
import type { ListCandidatesQueryDto } from './dto/list-candidates-query.dto';

@Injectable()
export class CandidateListService {
  constructor(private readonly queries: CandidateQueries) {}

  async list(
    query: ListCandidatesQueryDto,
  ): Promise<IPaginatedResult<CandidateListItemDto>> {
    const result = await this.queries.findPage(query);
    const candidateIds = result.data.map((candidate) => candidate.id);

    const [skills, applicationCounts] = await Promise.all([
      this.queries.findSkills(candidateIds),
      this.queries.countApplications(candidateIds),
    ]);

    return {
      data: result.data.map((candidate) =>
        toCandidateListItemDto(
          candidate,
          skills.get(candidate.id) ?? [],
          applicationCounts.get(candidate.id) ?? 0,
        ),
      ),
      meta: result.meta,
    };
  }
}
