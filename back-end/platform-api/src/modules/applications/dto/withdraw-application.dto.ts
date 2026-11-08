import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WithdrawApplicationDto {
  @ApiPropertyOptional({
    maxLength: 1000,
    description: 'Optional reason recorded in the status history',
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  reason?: string;
}
