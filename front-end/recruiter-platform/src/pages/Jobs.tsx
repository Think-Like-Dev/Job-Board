import { useGetJobs } from "@/api/hooks/useJobs";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@ui/button";
import { formatDate } from "date-fns";
import { formatEnumToStartCase } from "@/lib/utils";
import { type ColumnDef } from "@tanstack/react-table";
import { type Job, CompensationType, JobStatus } from "@/types/job.types";
import { PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const Jobs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: jobs, isLoading } = useGetJobs({
    page: 1,
    limit: 10,
    orderBy: "createdAt",
    orderByDirection: "DESC",
  });
  const columns: Array<ColumnDef<Partial<Job>>> = [
    { accessorKey: "code", header: "Job Code" },
    { accessorKey: "title", header: "Title" },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "status", header: "Status",cell:({getValue})=>formatEnumToStartCase(getValue() as JobStatus) },
    {
      accessorKey: "compensation",
      header: "Compensation",
      cell: ({ row }) => {
        const { compensation } = row.original;
        switch (compensation?.type) {
          case CompensationType.FIXED:
            return `${compensation.currency} ${compensation.amount} ${compensation.period}`;
          case CompensationType.RANGE:
            return `${compensation.currency} ${compensation.amount[0]} - ${compensation.amount[1]} ${compensation.period}`;
          case CompensationType.NEGOTIABLE:
            return compensation.currency ? `${compensation.currency} ${compensation.period ?? ""} (Negotiable)` : "Negotiable";
          default:
            return "N/A";
        }
      },
    },
    { accessorKey: "location", header: "Location" },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      cell: ({ getValue }) =>
        formatDate(getValue() as string, "dd-MM-yyyy") || "-",
    },
    {
      accessorKey: "updatedAt",
      header: "Updated Date",
      cell: ({ getValue }) =>
        formatDate(getValue() as string, "dd-MM-yyyy") || "-",
    },
  ];
  return (
    <section className="border-b flex flex-1 flex-col gap-4 bg-muted/50 min-h-full max-h-[calc(100vh-64px)] w-full p-2 aspect-video">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{t("job.listTitle")}</h1>
        <Button type="button" onClick={() => navigate("/jobs/new")}>
          <PlusIcon data-icon="inline-start" />
          {t("job.createJob")}
        </Button>
      </div>
      <DataTable
        data={jobs?.data?.length ? jobs.data : []}
        columns={columns}
        isLoading={isLoading}
      />
    </section>
  );
};

export default Jobs;
