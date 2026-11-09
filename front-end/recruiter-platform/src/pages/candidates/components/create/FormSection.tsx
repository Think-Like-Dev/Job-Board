import { useState, type ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ui/collapsible";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Collapsible group inside the create-candidate form. Desktop keeps the
 * sections open by default; the same component stacks into the mobile sheet.
 */
export function FormSection({
  title,
  defaultOpen = true,
  children,
}: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold">
        {title}
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t p-3">
        <div className="space-y-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
