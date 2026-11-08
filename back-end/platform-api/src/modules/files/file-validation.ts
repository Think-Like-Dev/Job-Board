import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';
import { FileType } from '@common/constants/enums';

const PDF_MIME = 'application/pdf';
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const JPEG_MIME = 'image/jpeg';
const JPG_MIME = 'image/jpg';
const PNG_MIME = 'image/png';
const WEBP_MIME = 'image/webp';

/** Per-kind upload rules enforced before a file reaches object storage. */
export interface UploadRule {
  label: string;
  maxBytes: number;
  extensions: readonly string[];
  mimeTypes: readonly string[];
  /** Human-readable list used in validation errors. */
  allowedLabel: string;
}

/**
 * Upload rules are shared by every entry point (direct `/files` uploads and
 * the multipart apply route) so size/type limits cannot drift apart.
 */
export const FILE_UPLOAD_RULES: Partial<Record<FileType, UploadRule>> = {
  [FileType.RESUME]: {
    label: 'Resume',
    maxBytes: 2 * 1024 * 1024,
    extensions: ['.pdf', '.docx'],
    mimeTypes: [PDF_MIME, DOCX_MIME],
    allowedLabel: 'a PDF or DOCX file',
  },
  [FileType.COVER_LETTER]: {
    label: 'Cover letter',
    maxBytes: 1 * 1024 * 1024,
    extensions: ['.pdf', '.docx'],
    mimeTypes: [PDF_MIME, DOCX_MIME],
    allowedLabel: 'a PDF or DOCX file',
  },
  [FileType.PROFILE_IMAGE]: {
    label: 'Profile image',
    maxBytes: 1 * 1024 * 1024,
    extensions: ['.jpg', '.jpeg', '.jfif', '.png', '.webp'],
    mimeTypes: [JPEG_MIME, JPG_MIME, PNG_MIME, WEBP_MIME],
    allowedLabel: 'a JPEG, PNG, or WebP image',
  },
  [FileType.CERTIFICATION]: {
    label: 'Certification',
    maxBytes: 2 * 1024 * 1024,
    extensions: [
      '.pdf',
      '.doc',
      '.docx',
      '.jpg',
      '.jpeg',
      '.jfif',
      '.png',
      '.webp',
    ],
    mimeTypes: [
      PDF_MIME,
      'application/msword',
      DOCX_MIME,
      JPEG_MIME,
      JPG_MIME,
      PNG_MIME,
      WEBP_MIME,
    ],
    allowedLabel: 'a PDF, DOC, or image file',
  },
};

/** Backwards-compatible alias for callers that only deal with applications. */
export const APPLICATION_UPLOAD_RULES = FILE_UPLOAD_RULES;

/** Largest per-file limit across application uploads (used by Multer). */
export const MAX_APPLICATION_UPLOAD_BYTES = 2 * 1024 * 1024;

/**
 * Validates size, extension and MIME type for a file about to be stored.
 * Types without a rule (for example internal offer letters) fall through.
 */
export function assertUploadMatchesType(
  file: Express.Multer.File,
  fileType: FileType,
): void {
  const rule = FILE_UPLOAD_RULES[fileType];
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
    throw new BadRequestException(`${rule.label} must be ${rule.allowedLabel}`);
  }

  if (!rule.mimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(`${rule.label} must be ${rule.allowedLabel}`);
  }
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
