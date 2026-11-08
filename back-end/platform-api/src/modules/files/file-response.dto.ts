import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileType } from '@common/constants/enums';

/** Client-safe file metadata. Internal keys and owner IDs are never exposed. */
export class FileDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ enum: FileType })
  fileType?: FileType;

  @ApiPropertyOptional()
  filename?: string;

  @ApiPropertyOptional()
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Size in bytes' })
  size?: number;

  @ApiProperty()
  createdAt!: string;
}

export class FilePaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class FileResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: FileDto })
  data!: FileDto;
}

export class FileListResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [FileDto] })
  data!: FileDto[];

  @ApiProperty({ type: FilePaginationDto })
  pagination!: FilePaginationDto;
}

export class FileDeletedResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ example: { id: '00000000-0000-0000-0000-000000000000' } })
  data!: { id: string };
}

/** A file read grant issued to one candidate. */
export class FileGrantDto {
  @ApiProperty({ format: 'uuid' })
  fileId!: string;

  @ApiProperty({ format: 'uuid' })
  candidateId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  grantedBy?: string;

  @ApiProperty()
  createdAt!: string;
}

export class FileGrantResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: FileGrantDto })
  data!: FileGrantDto;
}

export class FileGrantRevokedResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({
    example: {
      fileId: '00000000-0000-0000-0000-000000000000',
      candidateId: '00000000-0000-0000-0000-000000000000',
    },
  })
  data!: { fileId: string; candidateId: string };
}
