import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@ui/button";
import { Card, CardContent } from "@ui/card";

import {
  jobFormDefaultValues,
  type JobFormValues,
} from "@/api/schemas/jobs.schema";
import { useCreateJob, useGetJobById } from "@/api/hooks/useJobs";
import { JobStatus } from "@/types/job.types";

import { JobWizard } from "../JobForm/JobWizard";
import { jobDetailToCloneFormValues } from "../JobForm/mappers";

const CreateJob = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cloneFrom = searchParams.get("cloneFrom");
  const createJobMutation = useCreateJob();

  const {
    data: cloneSource,
    isLoading,
    isError,
  } = useGetJobById(cloneFrom ?? "");

  const handleSubmit = (values: JobFormValues, status: JobStatus) => {
    createJobMutation.mutate(
      { ...values, status },
      {
        onSuccess: () => {
          toast.success(
            status === JobStatus.PUBLISHED
              ? t("jobForm.toasts.published")
              : t("jobForm.toasts.draftSaved"),
          );
          navigate("/jobs");
        },
        onError: () => toast.error(t("jobForm.toasts.createFailed")),
      },
    );
  };

  if (cloneFrom) {
    if (isLoading) {
      return (
        <div className="flex flex-1 items-center justify-center p-8">
          <Loader2 className="animate-spin" />
        </div>
      );
    }

    if (isError || !cloneSource?.data) {
      return (
        <section className="flex flex-1 flex-col gap-4 p-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="space-y-1">
                <h1 className="text-lg font-semibold">
                  {t("jobForm.clone.loadFailedTitle")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("jobForm.clone.loadFailed")}
                </p>
              </div>
              <Button type="button" onClick={() => navigate("/jobs")}>
                {t("jobForm.actions.back")}
              </Button>
            </CardContent>
          </Card>
        </section>
      );
    }
  }

  return (
    <JobWizard
      key={cloneFrom ?? "create"}
      mode="create"
      heading={cloneFrom ? t("jobForm.cloneTitle") : undefined}
      defaultValues={
        cloneSource?.data
          ? jobDetailToCloneFormValues(cloneSource.data)
          : jobFormDefaultValues
      }
      isSubmitting={createJobMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={() => navigate("/jobs")}
    />
  );
};

export default CreateJob;
