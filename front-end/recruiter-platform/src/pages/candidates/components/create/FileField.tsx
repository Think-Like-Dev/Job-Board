import { useState, type ChangeEvent } from "react";
import { PaperclipIcon, XIcon } from "lucide-react";

import { Input } from "@ui/input";
import { Button } from "@ui/button";

import type { FileValidationError } from "@/lib/candidateFileValidation";
import { Field } from "./Field";

interface FileFieldMessages {
  tooLarge: string;
  invalidType: string;
  removeFile: string;
}

interface FileFieldProps {
  id: string;
  label: string;
  hint?: string;
  accept: string;
  required?: boolean;
  file: File | null;
  error?: string;
  validate: (file: File) => FileValidationError;
  messages: FileFieldMessages;
  onSelect: (file: File | null) => void;
}

/** Native file input with client-side type/size validation. */
export function FileField({
  id,
  label,
  hint,
  accept,
  required,
  file,
  error,
  validate,
  messages,
  onSelect,
}: FileFieldProps) {
  const [inputKey, setInputKey] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const reset = () => {
    setLocalError(null);
    onSelect(null);
    setInputKey((current) => current + 1);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      reset();
      return;
    }

    const result = validate(selected);
    if (result === "tooLarge") {
      setLocalError(messages.tooLarge);
      onSelect(null);
      event.target.value = "";
      return;
    }
    if (result === "invalidType") {
      setLocalError(messages.invalidType);
      onSelect(null);
      event.target.value = "";
      return;
    }

    setLocalError(null);
    onSelect(selected);
  };

  return (
    <Field label={label} htmlFor={id} required={required} error={localError ?? error}>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          key={inputKey}
          id={id}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="max-w-full"
        />
        {file ? (
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            <XIcon data-icon="inline-start" />
            {messages.removeFile}
          </Button>
        ) : null}
      </div>
      {file ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PaperclipIcon className="size-3" />
          {file.name}
        </p>
      ) : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </Field>
  );
}
