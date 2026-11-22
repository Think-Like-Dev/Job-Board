import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/dialog";
import { Input } from "@ui/input";
import { Label } from "@ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/select";
import { useInviteMember } from "@/api/hooks/useTeam";
import { usePermissions } from "@/permissions/usePermissions";
import { PERMISSIONS } from "@/permissions/permissions";
import { UserRole } from "@/types/auth.types";

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(UserRole),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type InviteValues = z.infer<typeof inviteSchema>;

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Invites a teammate; shows the copyable link when mail could not be sent. */
export function InviteMemberDialog({
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const isAdmin = can(PERMISSIONS.ADMIN_ACCESS);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: isAdmin ? UserRole.RECRUITER : UserRole.HIRING_MANAGER,
      firstName: "",
      lastName: "",
    },
  });

  const invite = useInviteMember();

  const onSubmit = (values: InviteValues) => {
    invite.mutate(
      {
        email: values.email,
        role: values.role,
        firstName: values.firstName || undefined,
        lastName: values.lastName || undefined,
      },
      {
        onSuccess: (result) => {
          setInvitationUrl(result.invitationUrl);
          form.reset({
            email: "",
            role: values.role,
            firstName: "",
            lastName: "",
          });
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const copyLink = async () => {
    if (!invitationUrl) return;
    await navigator.clipboard.writeText(invitationUrl);
    toast.success(t("team.inviteLinkCopied"));
  };

  const close = (next: boolean) => {
    if (!next) setInvitationUrl(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("team.inviteTitle")}</DialogTitle>
          <DialogDescription>{t("team.inviteDescription")}</DialogDescription>
        </DialogHeader>

        {invitationUrl ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("team.inviteSent")}
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={invitationUrl} />
              <Button type="button" variant="outline" onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" />
                {t("team.copyLink")}
              </Button>
            </div>
            <Button className="w-full" onClick={() => close(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
            id="invite-member-form"
          >
            <div className="space-y-2">
              <Label htmlFor="invite-email">{t("team.emailLabel")}</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="invite-first">{t("common.firstName")}</Label>
                <Input id="invite-first" {...form.register("firstName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-last">{t("common.lastName")}</Label>
                <Input id="invite-last" {...form.register("lastName")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("common.role")}</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(value) =>
                  form.setValue("role", value as UserRole)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && (
                    <SelectItem value={UserRole.ADMIN}>
                      {t("team.roleAdmin")}
                    </SelectItem>
                  )}
                  {isAdmin && (
                    <SelectItem value={UserRole.RECRUITER}>
                      {t("team.roleRecruiter")}
                    </SelectItem>
                  )}
                  <SelectItem value={UserRole.HIRING_MANAGER}>
                    {t("team.roleHiringManager")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => close(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("team.sendInvite")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
