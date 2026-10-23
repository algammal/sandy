import { AppShell } from "../../layouts/AppShell";

export default function AppRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
