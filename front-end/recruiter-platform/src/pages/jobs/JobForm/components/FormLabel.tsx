import type { ComponentProps } from "react";
import { Label } from "@ui/label";

interface FormLabelProps extends ComponentProps<typeof Label> {
  required?: boolean;
}

/** Label with an optional required-marker, used across every wizard step. */
export function FormLabel({ required, children, ...props }: FormLabelProps) {
  return (
    <Label {...props}>
      {children}
      {required ? <span className="text-destructive">*</span> : null}
    </Label>
  );
}
