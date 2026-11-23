import type { ReactNode } from "react";

import { Label } from "@ui/label";

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

/** Label + control + inline validation message. */
export function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
