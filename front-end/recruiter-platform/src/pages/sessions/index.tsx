import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { Badge } from "@ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/table";

import {
  useAdminSessions,
  useMySessions,
  useRevokeAdminSession,
  useRevokeMySession,
  useRevokeOtherSessions,
} from "@/api/hooks/useSessions";
import type { SessionRow } from "@/api/schemas/sessions.schema";
import { usePermissions } from "@/permissions/usePermissions";
import { PERMISSIONS } from "@/permissions/permissions";

function shortAgent(userAgent?: string) {
  if (!userAgent) return "—";
  return userAgent.length > 64 ? `${userAgent.slice(0, 61)}...` : userAgent;
}

function when(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

/** Session table shared by the self view and the admin lookup. */
function SessionsTable({
  rows,
  onRevoke,
  showOwner,
  pending,
}: {
  rows: SessionRow[];
  onRevoke?: (session: SessionRow) => void;
  showOwner?: boolean;
  pending?: boolean;
}) {
  const { t } = useTranslation();

  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("sessions.empty")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showOwner && <TableHead>{t("sessions.columnOwner")}</TableHead>}
          <TableHead>{t("sessions.columnDevice")}</TableHead>
          <TableHead>{t("sessions.columnIp")}</TableHead>
          <TableHead>{t("sessions.columnCreated")}</TableHead>
          <TableHead>{t("sessions.columnLastSeen")}</TableHead>
          <TableHead>{t("sessions.columnExpires")}</TableHead>
          {onRevoke && (
            <TableHead className="text-right">{t("common.actions")}</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((session) => (
          <TableRow key={`${session.principalId}-${session.id}`}>
            {showOwner && (
              <TableCell>
                <div className="font-medium">{session.email}</div>
                <div className="text-xs text-muted-foreground">
                  {session.principalType} · {session.role}
                </div>
              </TableCell>
            )}
            <TableCell
              className="max-w-[18rem] truncate text-sm"
              title={session.userAgent}
            >
              {shortAgent(session.userAgent)}
              {session.current && (
                <Badge variant="secondary" className="ml-2">
                  {t("sessions.current")}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-sm">{session.ip ?? "—"}</TableCell>
            <TableCell className="text-sm">{when(session.createdAt)}</TableCell>
            <TableCell className="text-sm">{when(session.lastSeenAt)}</TableCell>
            <TableCell className="text-sm">{when(session.expiresAt)}</TableCell>
            {onRevoke && (
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => onRevoke(session)}
                >
                  <LogOutIcon data-icon="inline-start" />
                  {t("sessions.revoke")}
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const Sessions = () => {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const isAdmin = can(PERMISSIONS.SESSION_READ_ALL);
  const canRevokeAny = can(PERMISSIONS.SESSION_REVOKE_ALL);

  const mine = useMySessions();
  const revokeMine = useRevokeMySession();
  const revokeOthers = useRevokeOtherSessions();
  const revokeAdmin = useRevokeAdminSession();

  const [email, setEmail] = useState("");
  const [adminQuery, setAdminQuery] = useState("");
  const admin = useAdminSessions({ email: adminQuery }, Boolean(adminQuery));

  const onRevokeMine = (session: SessionRow) => {
    revokeMine.mutate(session.id, {
      onSuccess: () => toast.success(t("sessions.revoked")),
      onError: (error) => toast.error(error.message),
    });
  };

  const onRevokeOthers = () => {
    revokeOthers.mutate(undefined, {
      onSuccess: (count) =>
        toast.success(t("sessions.revokedOthers", { count })),
      onError: (error) => toast.error(error.message),
    });
  };

  const onRevokeAdmin = (session: SessionRow) => {
    revokeAdmin.mutate(session, {
      onSuccess: () => toast.success(t("sessions.revoked")),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="flex flex-col gap-6 p-2">
      <div>
        <h1 className="text-2xl font-semibold">{t("sessions.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("sessions.subtitle")}</p>
      </div>

      <div className="rounded-md border">
        {mine.isLoading ? (
          <p className="py-6 text-center text-sm">{t("common.loading")}</p>
        ) : mine.isError ? (
          <p className="py-6 text-center text-sm">{t("sessions.loadError")}</p>
        ) : (
          <SessionsTable
            rows={mine.data ?? []}
            onRevoke={onRevokeMine}
            pending={revokeMine.isPending}
          />
        )}
      </div>

      <div>
        <Button
          variant="destructive"
          disabled={revokeOthers.isPending}
          onClick={onRevokeOthers}
        >
          <LogOutIcon data-icon="inline-start" />
          {t("sessions.revokeOthers")}
        </Button>
      </div>

      {isAdmin && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{t("sessions.adminTitle")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("sessions.adminSubtitle")}
            </p>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setAdminQuery(email.trim().toLowerCase());
            }}
          >
            <Input
              className="max-w-sm"
              type="email"
              placeholder={t("sessions.emailPlaceholder")}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" variant="outline" disabled={!email.trim()}>
              {t("sessions.lookup")}
            </Button>
          </form>

          {adminQuery && (
            <div className="rounded-md border">
              {admin.isLoading ? (
                <p className="py-6 text-center text-sm">
                  {t("common.loading")}
                </p>
              ) : admin.isError ? (
                <p className="py-6 text-center text-sm">
                  {t("sessions.loadError")}
                </p>
              ) : (
                <SessionsTable
                  rows={admin.data ?? []}
                  onRevoke={canRevokeAny ? onRevokeAdmin : undefined}
                  showOwner
                  pending={revokeAdmin.isPending}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sessions;
