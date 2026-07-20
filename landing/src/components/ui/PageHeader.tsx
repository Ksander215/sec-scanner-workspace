import { cn } from "@/lib/utils";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/layout/Breadcrumbs";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
  id?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  className,
  id,
  children,
}: PageHeaderProps) {
  return (
    <div id={id} className={cn("border-b border-border bg-surface/50", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-4 text-lg text-muted-2 leading-relaxed max-w-3xl">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
