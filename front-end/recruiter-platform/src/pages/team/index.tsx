import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Badge } from "@ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/table";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useDeleteInvitation,
  useResendInvite,
  useTeam,
  useUpdateMember,
} from "@/api/hooks/useTeam";
import { usePermissions } from "@/permissions/usePermissions";
import { PERMISSIONS } from "@/permissions/permissions";
import { UserStatus, type TeamMember } from "@/types/team.types";
import { InviteMemberDialog } from "./components/InviteMemberDialog";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

function statusVariant(status: UserStatus) {
  if (status === UserStatus.ACTIVE) return "secondary" as const;
  if (status === UserStatus.INVITED) return "outline" as const;
  return "destructive" as const;
}

const Team = () => {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [inviteOpen, setInviteOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const filters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      status: status === "ALL" ? undefined : (status as UserStatus),
    }),
    [page, debouncedSearch, status],
  );

  const { data, isLoading, isError, refetch } = useTeam(filters);
  const resend = useResendInvite();
  const removeInvitation = useDeleteInvitation();
  const update = useUpdateMember();
  const [pendingDelete, setPendingDelete] = useState<TeamMember | null>(null);

  const canInvite = can(PERMISSIONS.USER_INVITE);
  const canManageStatus = can(PERMISSIONS.USER_DELETE);

  const onResend = (member: TeamMember) => {
    resend.mutate(member.id, {
      onSuccess: () => toast.success(t("team.resendSuccess")),
      onError: (error) => toast.error(error.message),
    });
  };

  const onConfirmDelete = () => {
    if (!pendingDelete) return;
    removeInvitation.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success(t("team.deleteInvitationSuccess"));
        setPendingDelete(null);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  const onToggleStatus = (member: TeamMember) => {
    update.mutate(
      {
        id: member.id,
        payload: {
          status:
            member.status === UserStatus.ACTIVE
              ? UserStatus.SUSPENDED
              : UserStatus.ACTIVE,
        },
      },
      {
        onSuccess: () => toast.success(t("team.statusUpdated")),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4 p-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("team.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("team.subtitle")}
          </p>
        </div>
        {canInvite && (
          <Button onClick={() => setInviteOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t("team.inviteButton")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder={t("team.searchPlaceholder")}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select
          value={status}
          onValueChange={(value) => {
            if (!value) return;
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("common.allStatuses")}</SelectItem>
            <SelectItem value={UserStatus.INVITED}>
              {t("team.statusInvited")}
            </SelectItem>
            <SelectItem value={UserStatus.ACTIVE}>
              {t("team.statusActive")}
            </SelectItem>
            <SelectItem value={UserStatus.SUSPENDED}>
              {t("team.statusSuspended")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("team.columnMember")}</TableHead>
              <TableHead>{t("common.role")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("team.columnInvited")}</TableHead>
              <TableHead className="text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            )}

            {!isLoading && isError && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="mb-2">{t("team.loadError")}</p>
                  <Button variant="outline" onClick={() => void refetch()}>
                    {t("common.retry")}
                  </Button>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t("team.empty")}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              !isError &&
              data?.data.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">
                      {member.name ||
                        [member.firstName, member.lastName]
                          .filter(Boolean)
                          .join(" ") ||
                        "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {member.role
                      ? t(`team.role_${member.role}`)
                      : t("team.role_unknown")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(member.status)}>
                      {t(`team.status_${member.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {member.invitedAt
                      ? new Date(member.invitedAt).toLocaleDateString()
                      : "—"}
                    {member.status === UserStatus.INVITED && (
                      <span className="ml-1">
                        ({member.inviteSendCount}/3)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {member.status === UserStatus.INVITED && canInvite && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resend.isPending}
                            onClick={() => onResend(member)}
                          >
                            {t("team.resend")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={removeInvitation.isPending}
                            onClick={() => setPendingDelete(member)}
                          >
                            <Trash2Icon className="size-4" />
                            {t("team.deleteInvitation")}
                          </Button>
                        </>
                      )}
                      {member.status !== UserStatus.INVITED &&
                        canManageStatus && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={update.isPending}
                            onClick={() => onToggleStatus(member)}
                          >
                            {member.status === UserStatus.ACTIVE
                              ? t("team.suspend")
                              : t("team.activate")}
                          </Button>
                        )}
                      {member.status !== UserStatus.INVITED &&
                        !canManageStatus && (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("team.total", { total: data?.meta.totalItems ?? 0 })}
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {data?.meta.currentPage ?? page} / {data?.meta.totalPages || 1}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= (data?.meta.totalPages ?? 1)}
            onClick={() => setPage((current) => current + 1)}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("team.deleteInvitationTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? t("team.deleteInvitationDescription", {
                    email: pendingDelete.email,
                  })
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeInvitation.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={removeInvitation.isPending}
            >
              {removeInvitation.isPending
                ? t("common.deleting")
                : t("team.deleteInvitation")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
};

export default Team;
