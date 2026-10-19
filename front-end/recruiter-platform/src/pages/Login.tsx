import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { useLogin, useVerifyOtp } from "@api/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const navigate = useNavigate();
  const emailSchema = z.object({
    email: z
      .email(t("auth.emailErrorMessage"))
      .nonempty(t("auth.emailErrorMessage")),
    password: z.string().nonempty(t("auth.passwordErrorMessage")),
  });
  const otpSchema = z.object({
    otp: z.string().length(6, t("auth.otpErrorMessage")),
  });

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "", password: "" },
  });
  const loginMutation = useLogin();
  const onEmailSubmit = (values: z.infer<typeof emailSchema>) => {
    loginMutation.mutate(values, {
      onSuccess: () => {
        setEmail(values.email);
        setStep("otp");
        toast.success(t("auth.otpSendSuccess"));
      },
      onError: () => {
        toast.error(t("auth.loginError"));
      },
    });
  };
  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });
  const verifyOtpMutation = useVerifyOtp();

  const onOtpSubmit = (values: z.infer<typeof otpSchema>) => {
    verifyOtpMutation.mutate(
      { email, otp: values.otp },
      {
        onSuccess: () => {
          toast.success(t("auth.loginSuccess"));
          setStep("email");
          navigate("/");
        },
        onError: () => {
          toast.error(t("auth.otpVerifyError"));
        },
      },
    );
  };

  return (
    <section className="flex items-center justify-center h-screen w-screen">
      {step === "email" && (
        <form
          className="flex flex-col gap-y-4 p-6 border rounded-md w-96 bg-muted/20 backdrop-blur"
          onSubmit={emailForm.handleSubmit(onEmailSubmit)}
        >
          <h2 className="font-bold text-xl">{t("auth.login")}</h2>
          <div className="space-y-2">
            <Label htmlFor="email">
              {t("auth.emailLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              {...emailForm.register("email")}
              required
              className={
                emailForm.formState.errors.email && " border-destructive "
              }
            />
            {emailForm.formState.errors.email && (
              <p className="text-sm text-destructive">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {t("auth.passwordLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              type="password"
              placeholder={t("auth.passwordPlaceholder")}
              {...emailForm.register("password")}
              className={
                emailForm.formState.errors.password && " border-destructive "
              }
              required
            />
            {emailForm.formState.errors.password && (
              <p className="text-sm text-destructive">
                {emailForm.formState.errors.password.message}
              </p>
            )}
          </div>
          <Button disabled={loginMutation.isPending} type="submit">
            {loginMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" /> {t("auth.logging")}
              </>
            ) : (
              t("auth.login")
            )}
          </Button>
        </form>
      )}
      {step === "otp" && (
        <form
          onSubmit={otpForm.handleSubmit(onOtpSubmit)}
          className="flex flex-col gap-y-4 p-6 border rounded-md w-96 bg-muted/20 backdrop-blur"
        >
          <h2 className="font-bold text-xl">{t("auth.verifyOtp")}</h2>
          <div className="space-y-2">
            <Label htmlFor="otp">
              {t("auth.otpLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="otp"
              placeholder={t("auth.otpPlaceholder")}
              maxLength={6}
              {...otpForm.register("otp")}
              className={otpForm.formState.errors.otp && " border-destructive "}
            />
            {otpForm.formState.errors.otp && (
              <p className="text-sm text-destructive">
                {otpForm.formState.errors.otp.message}
              </p>
            )}
          </div>
          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("email")}
            >
              {t("nav.back")}
            </Button>
            <Button type="submit" disabled={verifyOtpMutation.isPending}>
              {verifyOtpMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" /> {t("auth.verifying")}
                </>
              ) : (
                t("auth.verify")
              )}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};

export default Login;
