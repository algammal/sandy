import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  LinkComponent?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>;
}

export function Breadcrumbs({ items, LinkComponent }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-[var(--sandy-muted-foreground)]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const content =
          item.href && !isLast ? (
            LinkComponent ? (
              <LinkComponent href={item.href} className="hover:text-[var(--sandy-foreground)]">
                {item.label}
              </LinkComponent>
            ) : (
              <a href={item.href} className="hover:text-[var(--sandy-foreground)]">
                {item.label}
              </a>
            )
          ) : (
            <span className={isLast ? "font-medium text-[var(--sandy-foreground)]" : undefined}>{item.label}</span>
          );
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {content}
            {!isLast && <ChevronRight className="size-3.5" aria-hidden />}
          </span>
        );
      })}
    </nav>
  );
}
