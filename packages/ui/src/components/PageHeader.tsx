import type { ReactNode } from "react";
import type { BreadcrumbItem } from "./Breadcrumbs";
import { Breadcrumbs } from "./Breadcrumbs";

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  LinkComponent?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>;
}

export function PageHeader({ title, description, breadcrumbs, actions, LinkComponent }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--sandy-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} LinkComponent={LinkComponent} />}
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--sandy-foreground)]">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-[var(--sandy-muted-foreground)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
