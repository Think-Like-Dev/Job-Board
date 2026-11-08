import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
import {
  CreateSkillDto,
  SkillListResponseDto,
  SkillQueryDto,
  SkillResponseDto,
} from './dto/skill.dto';
import { SkillsService } from './skills.service';
import { Skill } from './skill.schema';

@ApiTags('skills')
@SessionAuth()
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({
    summary: 'Search the canonical skill taxonomy (autocomplete)',
  })
  @ApiOkResponse({ type: SkillListResponseDto })
  async search(@Query() query: SkillQueryDto): Promise<SkillListResponseDto> {
    const skills = await this.skillsService.search(query.search);

    return {
      success: true,
      message: 'Skills fetched successfully',
      data: skills.map(toSkillDto),
    };
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a skill, or return the existing canonical skill with the same normalized name',
  })
  @ApiCreatedResponse({ type: SkillResponseDto })
  @ApiOkResponse({ type: SkillResponseDto })
  async create(
    @Body() dto: CreateSkillDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SkillResponseDto> {
    const { skill, created } = await this.skillsService.findOrCreate(dto.name);
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);

    return {
      success: true,
      message: created ? 'Skill created successfully' : 'Skill already exists',
      data: toSkillDto(skill),
    };
  }
}

function toSkillDto(skill: Skill): { id: string; name: string } {
  return { id: skill.id, name: skill.name };
}
