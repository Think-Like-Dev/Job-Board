import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { FileType } from '@common/constants/enums';
import { SessionAuthGuard } from '@modules/auth/session-auth.guard';
import type { AuthenticatedRequest } from '@modules/auth/auth.types';
import {
  FileDeletedResponseDto,
  FileGrantResponseDto,
  FileGrantRevokedResponseDto,
  FileListResponseDto,
  FileResponseDto,
} from './file-response.dto';
import { toFileDto, toFileGrantDto } from './file.presenter';
import { FileAccessGrantsService } from './file-access-grants.service';
import { FilesService } from './files.service';
import { ShareFileDto } from './share-file.dto';
import { UploadFileDto } from './upload-file.dto';

/** Hard ceiling for any upload; per-type limits are enforced by callers. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

@ApiTags('files')
@ApiCookieAuth('session_token')
@UseGuards(SessionAuthGuard)
@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly fileAccessGrants: FileAccessGrantsService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'fileType'],
      properties: {
        file: { type: 'string', format: 'binary' },
        fileType: { type: 'string', enum: Object.values(FileType) },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload a file; ownership is taken from the session',
  })
  @ApiCreatedResponse({ type: FileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<FileResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const created = await this.filesService.registerAndUpload(
      file,
      dto.fileType,
      req.session,
    );

    return {
      success: true,
      message: 'File uploaded successfully',
      data: toFileDto(created),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List files visible to the session (paginated)' })
  @ApiOkResponse({ type: FileListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async findAll(
    @Query() query: PaginationQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<FileListResponseDto> {
    const result = await this.filesService.listFiles(query, req.session);

    return {
      success: true,
      message: 'Files fetched successfully',
      data: result.data.map(toFileDto),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.meta.totalItems,
        totalPages: result.meta.totalPages,
      },
    };
  }

  @Get(':id/content')
  @ApiOperation({
    summary: 'Stream a file through the API (session-guarded, never public)',
  })
  @ApiProduces('application/octet-stream')
  @ApiOkResponse({
    description: 'Raw file bytes',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @ApiForbiddenResponse({
    description: 'Candidates may only read their own files',
  })
  async content(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { file, object } = await this.filesService.openFileForSession(
      id,
      req.session,
    );

    const filename = file.filename ?? file.id;
    const asciiFilename = sanitizeFilename(filename);

    res.setHeader(
      'Content-Disposition',
      `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

    return new StreamableFile(object.stream, {
      type: object.contentType ?? file.mimeType ?? 'application/octet-stream',
      length: object.contentLength,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiOkResponse({ type: FileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @ApiForbiddenResponse({
    description: 'Candidates may only read their own files',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<FileResponseDto> {
    const file = await this.filesService.findFileForSession(id, req.session);

    return {
      success: true,
      message: 'File fetched successfully',
      data: toFileDto(file),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file (uploader only)' })
  @ApiOkResponse({ type: FileDeletedResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @ApiForbiddenResponse({
    description: 'Only the session that uploaded the file may delete it',
  })
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<FileDeletedResponseDto> {
    await this.filesService.removeForSession(id, req.session);

    return {
      success: true,
      message: 'File deleted successfully',
      data: { id },
    };
  }

  @Post(':id/grants')
  @ApiOperation({
    summary: 'Share a file with a candidate (internal users only)',
  })
  @ApiCreatedResponse({ type: FileGrantResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @ApiForbiddenResponse({ description: 'Only internal users can share files' })
  async grant(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ShareFileDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<FileGrantResponseDto> {
    this.assertInternalUser(req);
    await this.filesService.findFileForSession(id, req.session);

    const grant = await this.fileAccessGrants.grant(
      id,
      dto.candidateId,
      req.session.principalId,
    );

    return {
      success: true,
      message: 'File shared with candidate',
      data: toFileGrantDto(grant),
    };
  }

  @Delete(':id/grants/:candidateId')
  @ApiOperation({
    summary: 'Revoke a candidate file grant (internal users only)',
  })
  @ApiOkResponse({ type: FileGrantRevokedResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  @ApiForbiddenResponse({
    description: 'Only internal users can revoke grants',
  })
  async revokeGrant(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('candidateId', new ParseUUIDPipe()) candidateId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<FileGrantRevokedResponseDto> {
    this.assertInternalUser(req);
    await this.filesService.findFileForSession(id, req.session);

    const revoked = await this.fileAccessGrants.revoke(id, candidateId);
    if (!revoked) {
      throw new NotFoundException('File grant not found');
    }

    return {
      success: true,
      message: 'File access revoked',
      data: { fileId: id, candidateId },
    };
  }

  private assertInternalUser(req: AuthenticatedRequest): void {
    if (req.session.principalType !== 'user') {
      throw new ForbiddenException('Only internal users can share files');
    }
  }
}

/** Prevents header injection and keeps the plain filename ASCII-only. */
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\\r\n]/g, '_');
}
