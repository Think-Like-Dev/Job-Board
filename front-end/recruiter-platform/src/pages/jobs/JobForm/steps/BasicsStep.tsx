import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Checkbox } from "@ui/checkbox";
import { Input } from "@ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/select";

import type { JobFormValues } from "@/api/schemas/jobs.schema";
import { EmploymentType, WorkMode } from "@/types/job.types";
import { formatEnumToStartCase } from "@/lib/utils";
import { FieldError } from "../components/FieldError";
import { FormLabel } from "../components/FormLabel";

interface BasicsStepProps {
  form: UseFormReturn<JobFormValues>;
}

/** Step 1 — core role details: title, department, category, type, location, work mode. */
export function BasicsStep({ form }: BasicsStepProps) {
  const { t } = useTranslation();
  const { errors } = form.formState;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <FormLabel htmlFor="title" required>
          {t("jobForm.fields.title")}
        </FormLabel>
        <Input
          id="title"
          placeholder={t("jobForm.placeholders.title")}
          aria-invalid={!!errors.title}
          {...form.register("title")}
        />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="department">
          {t("jobForm.fields.department")}
        </FormLabel>
        <Input
          id="department"
          placeholder={t("jobForm.placeholders.department")}
          {...form.register("department")}
        />
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="designation">
          {t("jobForm.fields.designation")}
        </FormLabel>
        <Input
          id="designation"
          placeholder={t("jobForm.placeholders.designation")}
          {...form.register("designation")}
        />
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="category" required>
          {t("jobForm.fields.category")}
        </FormLabel>
        <Input
          id="category"
          placeholder={t("jobForm.placeholders.category")}
          aria-invalid={!!errors.category}
          {...form.register("category")}
        />
        <FieldError message={errors.category?.message} />
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="employmentType" required>
          {t("jobForm.fields.employmentType")}
        </FormLabel>
        <Controller
          control={form.control}
          name="employmentType"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) => field.onChange(value)}
            >
              <SelectTrigger
                id="employmentType"
                className="w-full"
                aria-invalid={!!errors.employmentType}
              >
                <SelectValue>
                  {formatEnumToStartCase(field.value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(EmploymentType).map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatEnumToStartCase(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.employmentType?.message} />
      </div>

      <div className="space-y-2 md:col-span-2">
        <FormLabel htmlFor="location" required>
          {t("jobForm.fields.location")}
        </FormLabel>
        <Input
          id="location"
          placeholder={t("jobForm.placeholders.location")}
          aria-invalid={!!errors.location}
          {...form.register("location")}
        />
        <FieldError message={errors.location?.message} />
      </div>

      <div className="space-y-2 md:col-span-2">
        <FormLabel required>{t("jobForm.fields.workMode")}</FormLabel>
        <Controller
          control={form.control}
          name="workMode"
          render={({ field }) => (
            <div className="flex flex-wrap gap-4">
              {Object.values(WorkMode).map((mode) => (
                <label key={mode} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={field.value.includes(mode)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked
                          ? [...field.value, mode]
                          : field.value.filter((item) => item !== mode),
                      )
                    }
                  />
                  {formatEnumToStartCase(mode)}
                </label>
              ))}
            </div>
          )}
        />
        <FieldError message={errors.workMode?.message} />
      </div>
    </div>
  );
}
