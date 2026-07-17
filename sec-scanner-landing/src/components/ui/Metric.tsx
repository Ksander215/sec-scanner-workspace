import { cn } from "@/lib/utils";

interface MetricProps {
  label: string;
  value: string | number;
  suffix?: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
  className?: string;
}

export function Metric({ label, value, suffix, change, trend = "neutral", color, className }: MetricProps) {
  return (
    <div className={cn("p-5 rounded-xl bg-surface border border-border", className)}>
      <div className="text-xs text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-2xl font-bold", color || "text-foreground")}>{value}</span>
        {suffix && <span className="text-sm text-muted-2">{suffix}</span>}
      </div>
      {change && (
        <div className={cn(
          "text-xs mt-1",
          trend === "up" ? "text-red" : trend === "down" ? "text-accent" : "text-muted-2"
        )}>
          {change}
        </div>
      )}
    </div>
  );
}
