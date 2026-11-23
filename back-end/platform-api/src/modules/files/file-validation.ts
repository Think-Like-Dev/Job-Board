import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
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
 * Page limits for the two document kinds where length is part of the product
 * rule. A DOCX has no pages, so its extracted text is capped at the same
 * character count a page holds.
 */
const DOCUMENT_PAGE_LIMITS: Partial<
  Record<FileType, { maxPages: number; label: string }>
> = {
  [FileType.RESUME]: { maxPages: 3, label: 'Resume' },
  [FileType.COVER_LETTER]: { maxPages: 2, label: 'Cover letter' },
};

/** Characters per page used for the DOCX equivalent. */
const DOCX_CHARS_PER_PAGE = 3_000;

/**
 * Rejects a resume or cover letter that is longer than the product allows.
 *
 * Only those two file types are checked: a profile image or a certification
 * has no page rule. PDF pages are counted with pdf-lib; a DOCX is measured by
 * the text in `word/document.xml`, because it has no pages of its own.
 */
export async function assertPageLimit(
  file: Express.Multer.File,
  fileType: FileType,
): Promise<void> {
  const rule = DOCUMENT_PAGE_LIMITS[fileType];
  if (!rule) {
    return;
  }

  const pages = await countPages(file);
  if (pages > rule.maxPages) {
    throw new BadRequestException(
      `${rule.label} must be ${rule.maxPages} pages or fewer (this file has ${pages})`,
    );
  }
}

async function countPages(file: Express.Multer.File): Promise<number> {
  const extension = extname(file.originalname ?? '').toLowerCase();

  if (extension === '.pdf') {
    try {
      const document = await PDFDocument.load(file.buffer, {
        ignoreEncryption: true,
        updateMetadata: false,
      });
      return document.getPageCount();
    } catch {
      throw new BadRequestException('The PDF could not be read');
    }
  }

  if (extension === '.docx') {
    try {
      const archive = await JSZip.loadAsync(file.buffer);
      const xml = await archive.file('word/document.xml')?.async('string');
      if (!xml) {
        throw new Error('word/document.xml is missing');
      }
      const text = xml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return Math.max(1, Math.ceil(text.length / DOCX_CHARS_PER_PAGE));
    } catch {
      throw new BadRequestException('The DOCX could not be read');
    }
  }

  return 0;
}

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
