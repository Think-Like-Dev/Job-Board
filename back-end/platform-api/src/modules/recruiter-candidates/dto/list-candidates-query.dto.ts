import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export const CANDIDATE_SORT_VALUES = [
  'createdAt:ASC',
  'createdAt:DESC',
  'experience:ASC',
  'experience:DESC',
] as const;

/** `search` matches name, email, phone, and skill names. */
export class ListCandidatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: CANDIDATE_SORT_VALUES,
    default: 'createdAt:DESC',
    description: 'createdAt or experience, with an uppercase direction',
  })
  @IsOptional()
  @IsIn(CANDIDATE_SORT_VALUES)
  override sortBy?: string = undefined;
}
