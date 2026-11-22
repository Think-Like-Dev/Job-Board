import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Label } from "@ui/label";
import { useAcceptInvitation, useInvitationPreview } from "@/api/hooks/useTeam";

/**
 * Public onboarding screen reached from the invitation email.
 * The invited user chooses a password and fills the profile details; the API
 * then activates the account and starts the session.
 */
const Onboard = () => {
  const { t } = useTranslation();
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const preview = useInvitationPreview(token);
  const accept = useAcceptInvitation();

  const schema = z
    .object({
      firstName: z.string().min(1, t("common.fieldRequired")),
      lastName: z.string().min(1, t("common.fieldRequired")),
      phone: z.string().min(1, t("common.fieldRequired")),
      jobTitle: z.string().min(1, t("common.fieldRequired")),
      password: z.string().min(8, t("onboard.passwordLength")),
      confirmPassword: z.string().min(8, t("onboard.passwordLength")),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t("common.passwordMismatch"),
      path: ["confirmPassword"],
    });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      jobTitle: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!preview.data) return;
    form.reset({
      firstName: preview.data.firstName ?? "",
      lastName: preview.data.lastName ?? "",
      phone: "",
      jobTitle: "",
      password: "",
      confirmPassword: "",
    });
  }, [preview.data, form]);

  const onSubmit = (values: z.infer<typeof schema>) => {
    accept.mutate(
      {
        token,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        jobTitle: values.jobTitle,
      },
      {
        onSuccess: () => {
          toast.success(t("onboard.success"));
          navigate("/", { replace: true });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  if (preview.isLoading) {
    return (
      <section className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </section>
    );
  }

  if (preview.isError || !preview.data) {
    return (
      <section className="flex h-screen items-center justify-center">
        <div className="w-96 rounded-md border p-6 text-center">
          <h1 className="mb-2 text-xl font-bold">{t("onboard.invalidTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("onboard.invalidBody")}
          </p>
          <Button className="mt-4" onClick={() => navigate("/login")}>
            {t("common.backToSignIn")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-screen items-center justify-center py-10">
      <form
        className="flex w-[28rem] flex-col gap-y-4 rounded-md border bg-muted/20 p-6 backdrop-blur"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div>
          <h1 className="text-xl font-bold">{t("onboard.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("onboard.subtitle", {
              email: preview.data.email,
              role: t(`team.role_${preview.data.role}`),
            })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">{t("common.firstName")}</Label>
            <Input id="firstName" {...form.register("firstName")} />
            {form.formState.errors.firstName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">{t("common.lastName")}</Label>
            <Input id="lastName" {...form.register("lastName")} />
            {form.formState.errors.lastName && (
              <p className="text-sm text-destructive">
                {form.formState.errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("common.phone")}</Label>
          <Input id="phone" {...form.register("phone")} />
          {form.formState.errors.phone && (
            <p className="text-sm text-destructive">
              {form.formState.errors.phone.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobTitle">{t("common.jobTitle")}</Label>
          <Input id="jobTitle" {...form.register("jobTitle")} />
          {form.formState.errors.jobTitle && (
            <p className="text-sm text-destructive">
              {form.formState.errors.jobTitle.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("common.password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("onboard.confirmPassword")}</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" disabled={accept.isPending}>
          {accept.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("onboard.submit")}
        </Button>
      </form>
    </section>
  );
};

export default Onboard;
