import { AuthLayout } from "../../layouts/AuthLayout";

export default function AuthRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
