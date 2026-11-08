import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateSkillDto {
  @ApiProperty({ example: 'Node.js', minLength: 2, maxLength: 50 })
  @Transform(trimString)
  @IsString()
  @Length(2, 50)
  name!: string;
}

export class SkillQueryDto {
  @ApiPropertyOptional({
    description: 'Case/punctuation-insensitive autocomplete search',
    maxLength: 50,
  })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;
}

export class SkillDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Node.js' })
  name!: string;
}

export class SkillListResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [SkillDto] })
  data!: SkillDto[];
}

export class SkillResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: SkillDto })
  data!: SkillDto;
}
