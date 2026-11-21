import { BriefcaseBusinessIcon, GaugeIcon, MailIcon, UserCircleIcon, UsersIcon } from "lucide-react"
import type { ReactNode } from 'react';
import { PERMISSIONS, type Permission } from '@/permissions/permissions';

export interface NavMainItem {
  title: string;
  url: string;
  icon: ReactNode;
  /** The item only renders when the signed-in user holds this permission. */
  permission: Permission;
}

export const navMain: NavMainItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: (<GaugeIcon />),
    permission: PERMISSIONS.DASHBOARD_READ,
  },
  {
    title: "Jobs",
    url: "/jobs",
    icon: (<BriefcaseBusinessIcon />),
    permission: PERMISSIONS.JOB_READ,
  },
  {
    title: "Candidates",
    url: "/candidates",
    icon: (<UserCircleIcon />),
    permission: PERMISSIONS.CANDIDATE_READ,
  },
  {
    title: "Team",
    url: "/team",
    icon: (<UsersIcon />),
    permission: PERMISSIONS.USER_READ,
  },
  {
    title: "Mail Templates",
    url: "/mail-templates",
    icon: (<MailIcon />),
    permission: PERMISSIONS.ADMIN_ACCESS,
  }
]
