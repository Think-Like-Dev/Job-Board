import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@ui/button';
import { Label } from '@ui/label';
import { useUploadProfileFile } from '@api/hooks/useProfile';
import { useAuthenticatedFileUrl } from '@/hooks/useAuthenticatedFileUrl';
import { getErrorMessage } from '@utils/errorMessage';
import {
  validateImageSize,
  validatePassportAspectRatio,
  validateProfileImage,
} from '@utils/validators';
import type {
  ProfileFile,
  UploadedFile,
} from '../../../types/profile.types';
import { Trash2Icon } from 'lucide-react';

interface ProfileImageUploadProps {
  file?: ProfileFile | null;
  required?: boolean;
  error?: string | null;
  onUploaded: (file: UploadedFile) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
}

export function ProfileImageUpload({
  file,
  required = false,
  error,
  onUploaded,
  onRemove,
}: ProfileImageUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadProfileFile();
  const previewUrl = useAuthenticatedFileUrl(file?.id);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFile(selected: File | undefined) {
    if (!selected) return;
    setLocalError(null);

    if (!validateImageSize(selected, 1)) {
      const message = t('profile.photo.tooLarge');
      setLocalError(message);
      toast.error(message);
      return;
    }

    if (!validateProfileImage(selected)) {
      const message = t('profile.photo.invalid');
      setLocalError(message);
      toast.error(message);
      return;
    }

    const hasPassportRatio = await validatePassportAspectRatio(selected);
    if (!hasPassportRatio) {
      const message = t('profile.photo.passport');
      setLocalError(message);
      toast.error(message);
      return;
    }

    try {
      const uploaded = await upload.mutateAsync({
        file: selected,
        fileType: 'PROFILE_IMAGE',
      });
      await onUploaded(uploaded);
    } catch (error) {
      const message = getErrorMessage(error, t('profile.photo.uploadFailed'));
      setLocalError(message);
      toast.error(message);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove() {
    setLocalError(null);
    await onRemove();
  }

  const message = localError ?? error;

  return (
    <div className="flex flex-col items-center gap-3">
      <Label className="self-start">
        {t('profile.photo.title')}
        {required && <span className="text-destructive"> *</span>}
      </Label>

      <div className="relative flex h-40 w-32 items-center justify-center overflow-hidden rounded-md border-2 border-dashed bg-muted">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={t('profile.photo.title')}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="p-2 text-center text-xs text-muted-foreground">
            {t('profile.photo.hint')}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.jfif,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={upload.isPending}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending ? t('common.uploading') : 
           previewUrl ? t('profile.photo.replace') :
          t('profile.photo.upload')}
        </Button>
        {file && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="text-destructive"
            disabled={upload.isPending}
            onClick={() => void handleRemove()}
          >
            <Trash2Icon />
          </Button>
        )}
      </div>

      {message && <p className="text-xs text-destructive w-32">{message}</p>}
    </div>
  );
}
