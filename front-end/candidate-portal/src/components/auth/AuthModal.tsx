import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { useSendOtp, useVerifyOtp } from "@api/hooks/useAuth";

const emailSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

export function AuthModal({ children }: { children: React.ReactElement }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"options" | "email" | "otp">("options");
  const [email, setEmail] = useState("");

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();

  const onEmailSubmit = (values: z.infer<typeof emailSchema>) => {
    sendOtpMutation.mutate(values, {
      onSuccess: () => {
        setEmail(values.email);
        setStep("otp");
        toast.success("OTP sent successfully!");
      },
      onError: () => {
        toast.error("Failed to send OTP. Please try again.");
      },
    });
  };

  const onOtpSubmit = (values: z.infer<typeof otpSchema>) => {
    verifyOtpMutation.mutate(
      { email, otp: values.otp },
      {
        onSuccess: () => {
          toast.success("Logged in successfully!");
          setIsOpen(false);
          setStep("options");
        },
        onError: () => {
          toast.error("Invalid OTP. Please try again.");
        },
      },
    );
  };

  const resetState = () => {
    setStep("options");
    emailForm.reset();
    otpForm.reset();
    setEmail("");
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetState();
      }}
    >
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "otp" ? t("auth.otpTitle") : t("auth.title")}
          </DialogTitle>
          <DialogDescription>
            {step === "otp"
              ? `Enter the 6-digit code sent to ${email}`
              : "Sign in to save jobs, track applications, and more."}
          </DialogDescription>
        </DialogHeader>

        {step === "options" && (
          <div className="flex flex-col gap-4 py-4">
            <Button
              variant="outline"
              className="w-full h-12 text-base font-normal flex items-center justify-center gap-2"
              onClick={() => {
                toast.info("Google login is currently disabled for demo.");
              }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t("auth.continueWithGoogle")}
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 text-base font-normal flex items-center justify-center gap-2"
              onClick={() => {
                toast.info("LinkedIn login is currently disabled for demo.");
              }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              {t("auth.continueWithLinkedIn")}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-12 text-base font-normal flex items-center justify-center gap-2"
              onClick={() => setStep("email")}
            >
              <Mail className="w-5 h-5" />
              {t("auth.continueWithEmail")}
            </Button>
          </div>
        )}

        {step === "email" && (
          <form
            onSubmit={emailForm.handleSubmit(onEmailSubmit)}
            className="space-y-4 py-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">
                {t("auth.emailLabel")}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                placeholder="m@example.com"
                {...emailForm.register("email")}
                className={
                  emailForm.formState.errors.email ? "border-destructive" : ""
                }
              />
              {emailForm.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("options")}
              >
                Back
              </Button>
              <Button type="submit" disabled={sendOtpMutation.isPending}>
                {sendOtpMutation.isPending ? "Sending..." : "Continue"}
              </Button>
            </div>
          </form>
        )}

        {step === "otp" && (
          <form
            onSubmit={otpForm.handleSubmit(onOtpSubmit)}
            className="space-y-4 py-4"
          >
            <div className="space-y-2">
              <Label htmlFor="otp">
                {t("auth.otpLabel")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="otp"
                placeholder="123456"
                maxLength={6}
                {...otpForm.register("otp")}
                className={
                  otpForm.formState.errors.otp ? "border-destructive" : ""
                }
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
                Back
              </Button>
              <Button type="submit" disabled={verifyOtpMutation.isPending}>
                {verifyOtpMutation.isPending
                  ? "Verifying..."
                  : t("auth.verify")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
