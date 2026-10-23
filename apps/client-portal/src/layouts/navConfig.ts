import {
  Bot,
  Building2,
  LayoutDashboard,
  MapPin,
  Phone,
  HelpCircle,
  Landmark,
  ClipboardCheck,
  UserCircle,
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent-requests", label: "Requested Agents", icon: Bot },
  { href: "/business-profile", label: "Business Profile", icon: UserCircle },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/compounds", label: "Compounds", icon: Landmark },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/contacts", label: "Contact Numbers", icon: Phone },
  { href: "/faqs", label: "FAQs & Knowledge", icon: HelpCircle },
  { href: "/review", label: "Review & Submit", icon: ClipboardCheck },
] as const;
