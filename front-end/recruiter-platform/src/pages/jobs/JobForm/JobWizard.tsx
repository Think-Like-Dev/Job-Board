import { useMemo, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@ui/button";
import { Card, CardContent } from "@ui/card";

import {
  createJobFormSchema,
  type JobFormValues,
} from "@/api/schemas/jobs.schema";
import { JobStatus } from "@/types/job.types";

import { STEP_FIELDS, STEP_KEYS, hasErrorAtPath } from "./constants";
import { StepIndicator } from "./components/StepIndicator";
import { BasicsStep } from "./steps/BasicsStep";
import { DescriptionStep } from "./steps/DescriptionStep";
import { CompensationStep } from "./steps/CompensationStep";
import { ProcessStep } from "./steps/ProcessStep";
import { QuestionsStep } from "./steps/QuestionsStep";
import { ReviewStep } from "./steps/ReviewStep";

export type JobWizardMode = "create" | "edit";

interface JobWizardProps {
  mode: JobWizardMode;
  /** Overrides the header title, e.g. when creating a clone. */
  heading?: string;
  defaultValues: JobFormValues;
  isSubmitting: boolean;
  onSubmit: (values: JobFormValues, status: JobStatus) => void;
  onCancel: () => void;
}

/**
 * Shared create/edit wizard. It owns the form and step validation; callers only
 * provide initial values and decide which API to call for draft/publish.
 */
export function JobWizard({
  mode,
  heading,
  defaultValues,
  isSubmitting,
  onSubmit,
  onCancel,
}: JobWizardProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const schema = useMemo(() => createJobFormSchema(t), [t]);
  const form = useForm<JobFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
  });

  const goNext = async () => {
    const valid = await form.trigger(STEP_FIELDS[STEP_KEYS[currentStep]]);
    if (!valid) return;
    setCurrentStep((step) => Math.min(step + 1, STEP_KEYS.length - 1));
  };

  const goBack = () => setCurrentStep((step) => Math.max(step - 1, 0));

  const goToInvalidStep = (formErrors: FieldErrors<JobFormValues>) => {
    const index = STEP_KEYS.findIndex((key) =>
      STEP_FIELDS[key].some((field) => hasErrorAtPath(formErrors, field)),
    );
    if (index >= 0) setCurrentStep(index);
  };

  const handlePublish = form.handleSubmit(
    (formValues) => onSubmit(formValues, JobStatus.PUBLISHED),
    (formErrors) => goToInvalidStep(formErrors),
  );

  const handleSaveDraft = () => {
    const formValues = form.getValues();
    if (!formValues.title.trim()) {
      form.setError("title", {
        type: "manual",
        message: t("jobForm.validation.required"),
      });
      setCurrentStep(0);
      toast.error(t("jobForm.toasts.titleRequired"));
      return;
    }
    onSubmit(formValues, JobStatus.DRAFT);
  };

  const isReviewStep = currentStep === STEP_KEYS.length - 1;

  const renderStep = () => {
    switch (STEP_KEYS[currentStep]) {
      case "basics":
        return <BasicsStep form={form} />;
      case "description":
        return <DescriptionStep form={form} />;
      case "compensation":
        return <CompensationStep form={form} />;
      case "process":
        return <ProcessStep form={form} />;
      case "questions":
        return <QuestionsStep />;
      case "review":
        return <ReviewStep form={form} />;
    }
  };

  return (
    <section className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">
          {heading ??
            t(mode === "create" ? "jobForm.createTitle" : "jobForm.editTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("jobForm.stepOf", {
            current: currentStep + 1,
            total: STEP_KEYS.length,
          })}
        </p>
      </div>

      <StepIndicator currentStep={currentStep} onSelect={setCurrentStep} />

      <Card>
        <CardContent>
          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex flex-col gap-6"
          >
            {renderStep()}

            <div className="flex items-center justify-between gap-2 border-t pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={goBack}
                disabled={currentStep === 0}
              >
                {t("jobForm.actions.back")}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  {t("common.cancel")}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveDraft}
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? t("job.savingDraft")
                    : t("jobForm.actions.saveDraft")}
                </Button>

                {isReviewStep ? (
                  <Button
                    type="button"
                    onClick={handlePublish}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" />{" "}
                        {t("job.publishing")}
                      </>
                    ) : (
                      t("job.publish")
                    )}
                  </Button>
                ) : (
                  <Button type="button" onClick={goNext}>
                    {t("jobForm.actions.next")}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
