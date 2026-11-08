import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { FileType } from '@common/constants/enums';

/** Multipart upload fields; the binary itself is sent as the `file` part. */
export class UploadFileDto {
  @ApiProperty({
    enum: FileType,
    description: 'Kind of file being uploaded',
    example: FileType.RESUME,
  })
  @IsEnum(FileType)
  fileType!: FileType;
}
