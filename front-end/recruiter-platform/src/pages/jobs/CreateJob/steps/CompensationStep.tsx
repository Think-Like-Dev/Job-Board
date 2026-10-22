import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Input } from "@ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/select";

import { TagInput } from "@/components/jobs/TagInput";
import type { JobFormValues } from "@/api/schemas/jobs.schema";
import { CompensationType, Currency } from "@/types/job.types";
import { FieldError } from "../components/FieldError";
import { FormLabel } from "../components/FormLabel";
import { PERIODS, buildCompensation } from "../constants";

interface CompensationStepProps {
  form: UseFormReturn<JobFormValues>;
}

/** Step 3 — optional compensation, vacancies, benefits and shift timings. */
export function CompensationStep({ form }: CompensationStepProps) {
  const { t } = useTranslation();
  const { errors } = form.formState;
  const compensation = form.watch("compensation");
  const compensationType = compensation?.type ?? "NONE";

  const updateCompensation = (patch: Record<string, unknown>) => {
    form.setValue(
      "compensation",
      { ...(compensation ?? {}), ...patch } as JobFormValues["compensation"],
      { shouldValidate: true, shouldDirty: true },
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <FormLabel htmlFor="compensationType">
          {t("jobForm.fields.compensationType")}
        </FormLabel>
        <Select
          value={compensationType}
          onValueChange={(value) =>
            form.setValue(
              "compensation",
              buildCompensation(value as CompensationType | "NONE"),
              { shouldValidate: true, shouldDirty: true },
            )
          }
        >
          <SelectTrigger id="compensationType" className="w-full">
            <SelectValue>
              {t(`jobForm.compensationOptions.${compensationType}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NONE">
              {t("jobForm.compensationOptions.NONE")}
            </SelectItem>
            {Object.values(CompensationType).map((option) => (
              <SelectItem key={option} value={option}>
                {t(`jobForm.compensationOptions.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {compensationType !== "NONE" && (
        <>
          <div className="space-y-2">
            <FormLabel htmlFor="currency">
              {t("jobForm.fields.currency")}
            </FormLabel>
            <Select
              value={compensation?.currency ?? Currency.USD}
              onValueChange={(value) => updateCompensation({ currency: value })}
            >
              <SelectTrigger id="currency" className="w-full">
                <SelectValue>
                  {compensation?.currency ?? Currency.USD}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(Currency).map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FormLabel htmlFor="period">
              {t("jobForm.fields.period")}
            </FormLabel>
            <Select
              value={compensation?.period ?? "Yearly"}
              onValueChange={(value) => updateCompensation({ period: value })}
            >
              <SelectTrigger id="period" className="w-full">
                <SelectValue>
                  {t(
                    `jobForm.periodOptions.${compensation?.period ?? "Yearly"}`,
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`jobForm.periodOptions.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {compensation?.type === CompensationType.FIXED && (
            <div className="space-y-2 md:col-span-2">
              <FormLabel htmlFor="amount">
                {t("jobForm.fields.amount")}
              </FormLabel>
              <Input
                id="amount"
                type="number"
                min={0}
                value={compensation.amount}
                onChange={(event) =>
                  updateCompensation({ amount: Number(event.target.value) })
                }
              />
            </div>
          )}

          {compensation?.type === CompensationType.RANGE && (
            <>
              <div className="space-y-2">
                <FormLabel htmlFor="amountMin">
                  {t("jobForm.fields.amountMin")}
                </FormLabel>
                <Input
                  id="amountMin"
                  type="number"
                  min={0}
                  value={compensation.amount[0]}
                  onChange={(event) =>
                    updateCompensation({
                      amount: [
                        Number(event.target.value),
                        compensation.amount[1],
                      ],
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="amountMax">
                  {t("jobForm.fields.amountMax")}
                </FormLabel>
                <Input
                  id="amountMax"
                  type="number"
                  min={0}
                  value={compensation.amount[1]}
                  onChange={(event) =>
                    updateCompensation({
                      amount: [
                        compensation.amount[0],
                        Number(event.target.value),
                      ],
                    })
                  }
                />
              </div>
            </>
          )}
        </>
      )}

      <div className="space-y-2">
        <FormLabel htmlFor="vacancies">{t("jobForm.fields.vacancies")}</FormLabel>
        <Input
          id="vacancies"
          type="number"
          min={1}
          aria-invalid={!!errors.vacancies}
          {...form.register("vacancies", { valueAsNumber: true })}
        />
        <FieldError message={errors.vacancies?.message} />
      </div>

      <div className="space-y-2">
        <FormLabel htmlFor="benefits">{t("jobForm.fields.benefits")}</FormLabel>
        <Controller
          control={form.control}
          name="benefits"
          render={({ field }) => (
            <TagInput
              id="benefits"
              value={field.value}
              onChange={field.onChange}
              placeholder={t("jobForm.placeholders.tags")}
            />
          )}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <FormLabel htmlFor="workShiftTiming">
          {t("jobForm.fields.workShiftTiming")}
        </FormLabel>
        <Controller
          control={form.control}
          name="workShiftTiming"
          render={({ field }) => (
            <TagInput
              id="workShiftTiming"
              value={field.value}
              onChange={field.onChange}
              placeholder={t("jobForm.placeholders.shift")}
            />
          )}
        />
      </div>
    </div>
  );
}
