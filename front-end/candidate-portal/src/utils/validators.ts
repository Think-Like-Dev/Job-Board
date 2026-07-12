export const validateImageSize = (file: File, maxSizeMB: number = 1): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

export const validatePassportAspectRatio = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        // Standard passport aspect ratio is roughly 0.77 (e.g. 35x45mm)
        // Allow a small tolerance margin between 0.7 and 0.85
        const ratio = width / height;
        resolve(ratio >= 0.7 && ratio <= 0.85);
      };
    };
  });
};

export const validateResume = (file: File): boolean => {
  const maxSizeBytes = 2 * 1024 * 1024; // 2MB
  const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  return file.size <= maxSizeBytes && validTypes.includes(file.type);
};
