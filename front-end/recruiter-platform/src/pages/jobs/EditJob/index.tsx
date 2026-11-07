import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@ui/button";
import { Card, CardContent } from "@ui/card";

import type { JobFormValues } from "@/api/schemas/jobs.schema";
import { useGetJobById, useUpdateJob } from "@/api/hooks/useJobs";
import { JobStatus } from "@/types/job.types";

import { JobWizard } from "../JobForm/JobWizard";
import { jobDetailToFormValues } from "../JobForm/mappers";

const EditJob = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetJobById(id ?? "");
  const updateJobMutation = useUpdateJob();

  if (!id) {
    return <Navigate to="/jobs" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <section className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">
                {t("jobForm.edit.loadFailedTitle")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("jobForm.edit.loadFailed")}
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

  const job = data.data;

  if (job.status !== JobStatus.DRAFT) {
    return (
      <section className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">
                {t("jobForm.edit.notEditableTitle")}
              </h1>
              <p className="max-w-md text-sm text-muted-foreground">
                {t("jobForm.edit.notEditable")}
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

  const handleSubmit = (values: JobFormValues, status: JobStatus) => {
    updateJobMutation.mutate(
      { id: job.id, payload: { ...values, status } },
      {
        onSuccess: () => {
          toast.success(
            status === JobStatus.PUBLISHED
              ? t("jobForm.toasts.published")
              : t("jobForm.toasts.updated"),
          );
          navigate("/jobs");
        },
        onError: () => toast.error(t("jobForm.toasts.updateFailed")),
      },
    );
  };

  return (
    <JobWizard
      key={job.id}
      mode="edit"
      defaultValues={jobDetailToFormValues(job)}
      isSubmitting={updateJobMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={() => navigate("/jobs")}
    />
  );
};

export default EditJob;
