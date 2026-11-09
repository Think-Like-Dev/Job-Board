import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ui/sheet";

import { useCreateCandidate } from "@/api/hooks/useCandidates";
import {
  candidateFormDefaultValues,
  createCandidateFormSchema,
  type CandidateFormValues,
} from "@/api/schemas/candidates.schema";
import { ApiError } from "@/api/httpClient";
import { useIsDesktopPanel } from "@/hooks/useIsDesktopPanel";
import { CandidateFormBody } from "./create/CandidateFormBody";
import { buildCandidateFormData } from "./create/buildCandidateFormData";

interface CandidateCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (candidateId: string) => void;
}

/**
 * Recruiter manual candidate create. One form with collapsible sections:
 * centered scrollable dialog on desktop, full-screen sheet below 861px.
 * The resume is mandatory; a duplicate email is always rejected because a
 * recruiter can never replace an existing candidate's resume.
 */
export function CandidateCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: CandidateCreateDialogProps) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktopPanel();
  const createMutation = useCreateCandidate();

  const schema = useMemo(() => createCandidateFormSchema(t), [t]);
  const form = useForm<CandidateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: candidateFormDefaultValues,
    mode: "onBlur",
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | undefined>(undefined);

  const resetForm = () => {
    form.reset(candidateFormDefaultValues);
    setResumeFile(null);
    setProfileImageFile(null);
    setResumeError(undefined);
  };

  const handleOpenChange = (next: boolean) => {
    if (createMutation.isPending) return;
    if (!next) resetForm();
    onOpenChange(next);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!resumeFile) {
      setResumeError(t("candidate.form.validation.resumeRequired"));
      return;
    }
    setResumeError(undefined);

    try {
      const response = await createMutation.mutateAsync(
        buildCandidateFormData(values, { resumeFile, profileImageFile }),
      );

      toast.success(t("candidate.form.success"));
      resetForm();
      onOpenChange(false);
      onCreated(response.data.id);
    } catch (error) {
      const duplicate = error instanceof ApiError && error.status === 409;
      toast.error(
        duplicate
          ? t("candidate.form.duplicateEmail")
          : t("candidate.form.failure"),
      );
    }
  });

  const formBody = (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <CandidateFormBody
          form={form}
          resumeFile={resumeFile}
          profileImageFile={profileImageFile}
          resumeError={resumeError}
          onResumeChange={(file) => {
            setResumeFile(file);
            if (file) setResumeError(undefined);
          }}
          onProfileImageChange={setProfileImageFile}
        />
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOpenChange(false)}
          disabled={createMutation.isPending}
        >
          {t("candidate.form.cancel")}
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : null}
          {createMutation.isPending
            ? t("candidate.form.submitting")
            : t("candidate.form.submit")}
        </Button>
      </div>
    </form>
  );

  if (!isDesktop) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full! gap-0 p-0 sm:max-w-none!"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b p-4">
            <SheetHeader className="min-w-0 p-0">
              <SheetTitle>{t("candidate.form.title")}</SheetTitle>
              <SheetDescription>
                {t("candidate.form.description")}
              </SheetDescription>
            </SheetHeader>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleOpenChange(false)}
              aria-label={t("common.close")}
              disabled={createMutation.isPending}
            >
              <XIcon />
            </Button>
          </div>
          {formBody}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90dvh] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b p-4">
          <DialogHeader className="min-w-0">
            <DialogTitle>{t("candidate.form.title")}</DialogTitle>
            <DialogDescription>
              {t("candidate.form.description")}
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => handleOpenChange(false)}
            aria-label={t("common.close")}
            disabled={createMutation.isPending}
          >
            <XIcon />
          </Button>
        </div>
        {formBody}
      </DialogContent>
    </Dialog>
  );
}
