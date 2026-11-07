import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Body for sharing a file with one candidate. */
export class ShareFileDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  candidateId!: string;
}
