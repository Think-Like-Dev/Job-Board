import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useConfirmPasswordReset,
  useRequestPasswordReset,
} from "@api/hooks/useAuth";

/**
 * Password reset. Without a `?token=` it asks for the email address; with one
 * it shows the new-password form for that single-use link.
 */
const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [localResetUrl, setLocalResetUrl] = useState<string | null>(null);

  const requestSchema = z.object({
    email: z.email(t("auth.emailErrorMessage")),
  });
  const confirmSchema = z
    .object({
      password: z.string().min(8, t("auth.passwordErrorMessage")),
      confirmPassword: z.string().min(8, t("auth.passwordErrorMessage")),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t("common.passwordMismatch"),
      path: ["confirmPassword"],
    });

  const requestForm = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
  });
  const confirmForm = useForm({
    resolver: zodResolver(confirmSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const requestMutation = useRequestPasswordReset();
  const confirmMutation = useConfirmPasswordReset();

  const onRequest = (values: z.infer<typeof requestSchema>) => {
    requestMutation.mutate(values, {
      onSuccess: (response) => {
        setSentMessage(response.message);
        setLocalResetUrl(response.resetUrl ?? null);
        toast.success(t("auth.resetPasswordSent"));
      },
      onError: () => toast.error(t("auth.resetPasswordError")),
    });
  };

  const onConfirm = (values: z.infer<typeof confirmSchema>) => {
    confirmMutation.mutate(
      { token, password: values.password },
      {
        onSuccess: () => {
          toast.success(t("auth.resetPasswordSuccess"));
          navigate("/login", { replace: true });
        },
        onError: () => toast.error(t("auth.resetPasswordInvalid")),
      },
    );
  };

  return (
    <section className="flex items-center justify-center h-screen w-screen">
      {token ? (
        <form
          className="flex flex-col gap-y-4 p-6 border rounded-md w-96 bg-muted/20 backdrop-blur"
          onSubmit={confirmForm.handleSubmit(onConfirm)}
        >
          <h2 className="font-bold text-xl">{t("auth.newPasswordTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("auth.newPasswordDescription")}
          </p>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.newPasswordLabel")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...confirmForm.register("password")}
            />
            {confirmForm.formState.errors.password && (
              <p className="text-sm text-destructive">
                {confirmForm.formState.errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {t("auth.newPasswordConfirmLabel")}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...confirmForm.register("confirmPassword")}
            />
            {confirmForm.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {confirmForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={confirmMutation.isPending}>
            {confirmMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {confirmMutation.isPending
              ? t("common.saving")
              : t("auth.resetPasswordSubmit")}
          </Button>
          <Link className="text-sm text-center underline" to="/login">
            {t("common.backToSignIn")}
          </Link>
        </form>
      ) : (
        <form
          className="flex flex-col gap-y-4 p-6 border rounded-md w-96 bg-muted/20 backdrop-blur"
          onSubmit={requestForm.handleSubmit(onRequest)}
        >
          <h2 className="font-bold text-xl">{t("auth.resetPasswordTitle")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("auth.resetPasswordDescription")}
          </p>
          <div className="space-y-2">
            <Label htmlFor="reset-email">{t("auth.emailLabel")}</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
              {...requestForm.register("email")}
            />
            {requestForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {requestForm.formState.errors.email.message}
              </p>
            )}
          </div>
          <Button type="submit" disabled={requestMutation.isPending}>
            {requestMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {requestMutation.isPending
              ? t("auth.resetPasswordRequesting")
              : t("auth.resetPasswordRequest")}
          </Button>
          {sentMessage && (
            <div className="text-sm text-muted-foreground">
              <p>{sentMessage}</p>
              {localResetUrl && (
                <a className="underline break-all" href={localResetUrl}>
                  {t("auth.resetPasswordLocalLink")}
                </a>
              )}
            </div>
          )}
          <Link className="text-sm text-center underline" to="/login">
            {t("common.backToSignIn")}
          </Link>
        </form>
      )}
    </section>
  );
};

export default ResetPassword;
