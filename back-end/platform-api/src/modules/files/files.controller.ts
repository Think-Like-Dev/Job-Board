import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @ApiOperation({ summary: 'Register upload metadata' })
  create(@Body() body: Record<string, unknown>) {
    return this.filesService.register(body);
  }

  @Get()
  @ApiOperation({ summary: 'List files (paginated)' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.filesService.findAllPaginated(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one file' })
  findOne(@Param('id') id: string) {
    return this.filesService.findOne({ id });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  remove(@Param('id') id: string) {
    return this.filesService.remove({ id });
  }
}
