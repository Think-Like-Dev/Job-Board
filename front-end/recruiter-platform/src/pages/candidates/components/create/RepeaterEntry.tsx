import type { ReactNode } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@ui/button";

interface RepeaterEntryProps {
  index: number;
  label: string;
  removeLabel: string;
  onRemove: () => void;
  children: ReactNode;
}

/** Card wrapper for one education/experience/certification entry. */
export function RepeaterEntry({
  index,
  label,
  removeLabel,
  onRemove,
  children,
}: RepeaterEntryProps) {
  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label} {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={removeLabel}
          title={removeLabel}
        >
          <Trash2Icon />
        </Button>
      </div>
      {children}
    </div>
  );
}

interface AddEntryButtonProps {
  label: string;
  onAdd: () => void;
}

export function AddEntryButton({ label, onAdd }: AddEntryButtonProps) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onAdd}>
      <PlusIcon data-icon="inline-start" />
      {label}
    </Button>
  );
}
