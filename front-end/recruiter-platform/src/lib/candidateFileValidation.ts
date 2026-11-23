export type FileValidationError = "tooLarge" | "invalidType" | null;

const RESUME_MAX_BYTES = 2 * 1024 * 1024;
const RESUME_EXTENSIONS = [".pdf", ".docx"];
const RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const PROFILE_IMAGE_MAX_BYTES = 1 * 1024 * 1024;
const PROFILE_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".jfif", ".png", ".webp"];
const PROFILE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

/** Mirrors the backend RESUME upload rule (PDF/DOCX, 2 MB). */
export function validateResumeFile(file: File): FileValidationError {
  if (file.size > RESUME_MAX_BYTES) return "tooLarge";
  if (
    !RESUME_EXTENSIONS.includes(extensionOf(file.name)) ||
    !RESUME_MIME_TYPES.includes(file.type)
  ) {
    return "invalidType";
  }
  return null;
}

/** Mirrors the backend PROFILE_IMAGE rule (JPEG/PNG/WebP, 1 MB). */
export function validateProfileImageFile(file: File): FileValidationError {
  if (file.size > PROFILE_IMAGE_MAX_BYTES) return "tooLarge";
  if (
    !PROFILE_IMAGE_EXTENSIONS.includes(extensionOf(file.name)) ||
    !PROFILE_IMAGE_MIME_TYPES.includes(file.type)
  ) {
    return "invalidType";
  }
  return null;
}
