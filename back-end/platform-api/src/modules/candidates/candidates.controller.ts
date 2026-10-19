import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CandidatesService } from './candidates.service';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@ApiTags('candidates')
@ApiBearerAuth()
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  @ApiOperation({ summary: 'List candidates (paginated)' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.candidatesService.findAllPaginated(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one candidate' })
  findOne(@Param('id') id: string) {
    return this.candidatesService.findOne({ id });
  }
}
