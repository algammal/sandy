import { Activity, Bot, LayoutDashboard, Sparkles, Users } from "lucide-react";

export const navItems = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/agent-studio", label: "Agent Studio", icon: Sparkles },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/activity", label: "Activity", icon: Activity },
] as const;
