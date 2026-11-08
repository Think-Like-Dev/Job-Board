import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';
import { FileType } from '@common/constants/enums';

const PDF_MIME = 'application/pdf';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Per-kind upload rules enforced before a file reaches object storage. */
export interface UploadRule {
  label: string;
  maxBytes: number;
  extensions: readonly string[];
  mimeTypes: readonly string[];
}

export const APPLICATION_UPLOAD_RULES: Partial<Record<FileType, UploadRule>> = {
  [FileType.RESUME]: {
    label: 'Resume',
    maxBytes: 2 * 1024 * 1024,
    extensions: ['.pdf', '.docx'],
    mimeTypes: [PDF_MIME, DOCX_MIME],
  },
  [FileType.COVER_LETTER]: {
    label: 'Cover letter',
    maxBytes: 1 * 1024 * 1024,
    extensions: ['.pdf', '.docx'],
    mimeTypes: [PDF_MIME, DOCX_MIME],
  },
};

/** Largest per-file limit across application uploads (used by Multer). */
export const MAX_APPLICATION_UPLOAD_BYTES = 2 * 1024 * 1024;

/**
 * Validates size, extension and MIME type for a file about to be stored.
 * Keeping the rules in one place stops the apply flow and any future caller
 * from drifting apart.
 */
export function assertUploadMatchesType(
  file: Express.Multer.File,
  fileType: FileType,
): void {
  const rule = APPLICATION_UPLOAD_RULES[fileType];
  if (!rule) {
    return;
  }

  if (!file?.buffer?.length) {
    throw new BadRequestException(`${rule.label} file is empty`);
  }

  if (file.size > rule.maxBytes) {
    throw new BadRequestException(
      `${rule.label} must be ${formatMegabytes(rule.maxBytes)} or smaller`,
    );
  }

  const extension = extname(file.originalname ?? '').toLowerCase();
  if (!rule.extensions.includes(extension)) {
    throw new BadRequestException(`${rule.label} must be a PDF or DOCX file`);
  }

  if (!rule.mimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(`${rule.label} must be a PDF or DOCX file`);
  }
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
