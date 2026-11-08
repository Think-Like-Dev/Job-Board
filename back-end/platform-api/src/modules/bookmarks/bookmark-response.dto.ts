import { ApiProperty } from '@nestjs/swagger';
import { PublicJobSummaryDto } from '@modules/jobs/public-job-response.dto';

export class BookmarkStateDto {
  @ApiProperty({ format: 'uuid' })
  jobId!: string;

  @ApiProperty()
  isBookmarked!: boolean;
}

export class BookmarkListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Bookmarks fetched successfully' })
  message!: string;

  @ApiProperty({ type: [PublicJobSummaryDto] })
  data!: PublicJobSummaryDto[];
}

export class BookmarkResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Job saved' })
  message!: string;

  @ApiProperty({ type: BookmarkStateDto })
  data!: BookmarkStateDto;
}
