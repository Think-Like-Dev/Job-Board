import {BriefcaseBusinessIcon, GaugeIcon, MailIcon, UserCircleIcon} from "lucide-react"

export const navMain = [
  {
    title: "Dashboard",
    url: "/",
    icon: (<GaugeIcon />)
  },
  {
    title: "Jobs",
    url: "/jobs",
    icon: (<BriefcaseBusinessIcon />)
  },
  {
    title: "Candidates",
    url: "/candidates",
    icon: (<UserCircleIcon />)
  },
  {
    title: "Mail Templates",
    url: "/mail-templates",
    icon: (<MailIcon />)
  }
]