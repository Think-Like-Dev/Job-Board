import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@ui/button';
import { useUploadProfileFile } from '@api/hooks/useProfile';
import { openAuthenticatedFile } from '@utils/fileActions';
import { getErrorMessage } from '@utils/errorMessage';
import type {
  ProfileFile,
  UploadedFile,
} from '../../../types/profile.types';

interface DocumentUploadCardProps {
  title: string;
  description: string;
  file?: ProfileFile | null;
  fileType: 'RESUME' | 'COVER_LETTER';
  accept: string;
  uploadLabel: string;
  replaceLabel: string;
  noneLabel: string;
  invalidMessage: string;
  required?: boolean;
  error?: string | null;
  validate: (file: File) => boolean;
  onUploaded: (file: UploadedFile) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
}

/**
 * File inputs save immediately: the upload happens first, then the returned
 * file id is persisted on the profile. Non-file fields still wait for Save.
 */
export function DocumentUploadCard({
  title,
  description,
  file,
  fileType,
  accept,
  uploadLabel,
  replaceLabel,
  noneLabel,
  invalidMessage,
  required = false,
  error,
  validate,
  onUploaded,
  onRemove,
}: DocumentUploadCardProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadProfileFile();
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleFile(selected: File | undefined) {
    if (!selected) return;
    setLocalError(null);

    if (!validate(selected)) {
      setLocalError(invalidMessage);
      toast.error(invalidMessage);
      return;
    }

    try {
      const uploaded = await upload.mutateAsync({ file: selected, fileType });
      await onUploaded(uploaded);
    } catch (error) {
      const message = getErrorMessage(
        error,
        t('profile.documents.uploadFailed'),
      );
      setLocalError(message);
      toast.error(message);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove() {
    setLocalError(null);
    await onRemove?.();
  }

  const message = localError ?? error;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-medium">
          {title}
          {required && <span className="text-destructive"> *</span>}
        </h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {file ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
          <span className="min-w-0 flex-1 truncate text-sm">
            {file.filename ?? noneLabel}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void openAuthenticatedFile(file.id)}
          >
            {t('common.view')}
          </Button>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => void handleRemove()}
            >
              {t('common.remove')}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{noneLabel}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={upload.isPending}
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending
            ? t('common.uploading')
            : file
              ? replaceLabel
              : uploadLabel}
        </Button>
      </div>

      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  );
}
