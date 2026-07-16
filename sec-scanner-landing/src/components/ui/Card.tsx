import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface CardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  href?: string;
  badge?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Card({
  title,
  description,
  icon: Icon,
  href,
  badge,
  className,
  children,
}: CardProps) {
  const inner = (
    <>
      {(Icon || badge) && (
        <div className="flex items-center justify-between mb-3">
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
              <Icon className="w-5 h-5 text-accent" />
            </div>
          )}
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-surface-2 text-muted-2 border border-border">
              {badge}
            </span>
          )}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-2 leading-relaxed">{description}</p>
      )}
      {children}
    </>
  );

  const cardClasses = cn(
    "group relative p-6 rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-300",
    href && "hover:bg-surface-2 cursor-pointer",
    className
  );

  if (href) {
    return (
      <Link href={href} className={cardClasses}>
        {inner}
      </Link>
    );
  }

  return <div className={cardClasses}>{inner}</div>;
}
