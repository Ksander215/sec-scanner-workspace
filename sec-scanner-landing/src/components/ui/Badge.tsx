import { cn } from "@/lib/utils";

type BadgeVariant =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "category"
  | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  critical: "bg-red-muted text-red border-red/20",
  high: "bg-amber-muted text-amber border-amber/20",
  medium: "bg-amber-muted text-amber border-amber/20",
  low: "bg-accent-muted text-accent border-accent/20",
  info: "bg-cyan-muted text-cyan border-cyan/20",
  category: "bg-surface-2 text-muted-2 border-border",
  default: "bg-surface-2 text-foreground border-border",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-md border transition-colors",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
