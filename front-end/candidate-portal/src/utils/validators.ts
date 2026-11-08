export const validateImageSize = (file: File, maxSizeMB: number = 1): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

export const validatePassportAspectRatio = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    // A corrupt/unreadable image must not leave the upload button hanging.
    const timeout = setTimeout(() => finish(false), 5000);

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
        const ratio = img.width / img.height;
        // Passport photos are portrait (35x45mm, ratio ~0.78) or square
        // (2x2in, ratio 1). Reject landscape and extreme portrait crops.
        finish(ratio >= 0.6 && ratio <= 1);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        finish(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      finish(false);
    };
    reader.readAsDataURL(file);
  });
};

const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const DOCUMENT_EXTENSIONS = ['.pdf', '.docx'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.jfif', '.png', '.webp'];
const CERTIFICATION_MIME_TYPES = [
  ...DOCUMENT_MIME_TYPES,
  'application/msword',
  ...IMAGE_MIME_TYPES,
];
const CERTIFICATION_EXTENSIONS = [
  ...DOCUMENT_EXTENSIONS,
  '.doc',
  ...IMAGE_EXTENSIONS,
];

function hasAllowedExtension(file: File, extensions: string[]): boolean {
  const name = file.name.toLowerCase();
  return extensions.some((extension) => name.endsWith(extension));
}

function validateDocument(file: File, maxSizeMB: number): boolean {
  return (
    file.size <= maxSizeMB * 1024 * 1024 &&
    DOCUMENT_MIME_TYPES.includes(file.type) &&
    hasAllowedExtension(file, DOCUMENT_EXTENSIONS)
  );
}

export const validateResume = (file: File): boolean => validateDocument(file, 2);

export const validateCoverLetter = (file: File): boolean =>
  validateDocument(file, 1);

export const validateProfileImage = (file: File): boolean =>
  file.size <= 1024 * 1024 &&
  IMAGE_MIME_TYPES.includes(file.type) &&
  hasAllowedExtension(file, IMAGE_EXTENSIONS);

export const validateCertificationFile = (file: File): boolean =>
  file.size <= 2 * 1024 * 1024 &&
  CERTIFICATION_MIME_TYPES.includes(file.type) &&
  hasAllowedExtension(file, CERTIFICATION_EXTENSIONS);
