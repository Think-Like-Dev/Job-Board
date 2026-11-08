import type { ReactNode } from "react";
import { PanelLeftCloseIcon, PanelRightCloseIcon, XIcon } from "lucide-react";

import { Button } from "@ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ui/sheet";

import { useIsDesktopPanel } from "@/hooks/useIsDesktopPanel";
import { cn } from "@/lib/utils";

interface ResponsiveSidePanelProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  headerActions?: ReactNode;
  closeLabel: string;
  side?: "left" | "right";
  widthClassName?: string;
  bodyClassName?: string;
  fillHeight?: boolean;
  children: ReactNode;
}

/**
 * Shared shell for the applications workspace panels. On desktop (>=861px) it
 * renders as an inline aside beside the candidate table; below that it becomes
 * a full-width right sheet so the table is never squeezed on small screens.
 */
export function ResponsiveSidePanel({
  open,
  onClose,
  title,
  description,
  headerActions,
  closeLabel,
  side = "right",
  widthClassName,
  bodyClassName,
  fillHeight = false,
  children,
}: ResponsiveSidePanelProps) {
  const isDesktop = useIsDesktopPanel();

  if (!isDesktop) {
    return (
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose();
        }}
      >
        <SheetContent
          side={side}
          showCloseButton={false}
          className="w-full! gap-0 p-0 sm:max-w-none!"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b p-4">
            <SheetHeader className="min-w-0 p-0">
              <SheetTitle className="truncate">{title}</SheetTitle>
              {description ? (
                <SheetDescription className="truncate">
                  {description}
                </SheetDescription>
              ) : null}
            </SheetHeader>
            <div className="flex shrink-0 items-center gap-1">
              {headerActions}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={closeLabel}
              >
                <XIcon />
              </Button>
            </div>
          </div>
          <div
            className={cn(
              "min-h-0 flex-1",
              fillHeight
                ? "flex flex-col overflow-hidden p-2"
                : "overflow-y-auto p-4",
              bodyClassName,
            )}
          >
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!open) return null;

  const CloseIcon = side === "left" ? PanelLeftCloseIcon : PanelRightCloseIcon;

  return (
    <aside
      className={cn(
        "flex min-h-0 shrink-0 flex-col overflow-hidden rounded-lg border bg-background",
        widthClassName ?? "w-96",
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          {description ? (
            <p className="truncate text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerActions}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <CloseIcon />
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1",
          fillHeight
            ? "flex flex-col overflow-hidden p-2"
            : "overflow-y-auto p-3",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </aside>
  );
}
