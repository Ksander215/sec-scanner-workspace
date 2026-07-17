import { cn } from "@/lib/utils";

interface TimelineProps {
  items: {
    title: string;
    description?: string;
    date?: string;
    status?: "completed" | "current" | "upcoming";
    icon?: React.ElementType;
  }[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const Icon = item.icon;
        return (
          <div key={i} className="flex gap-4">
            {/* Line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2",
                  item.status === "completed"
                    ? "bg-accent-muted border-accent/30"
                    : item.status === "current"
                    ? "bg-cyan-muted border-cyan/30 shadow-[0_0_12px_rgba(0,212,255,0.2)]"
                    : "bg-surface-2 border-border"
                )}
              >
                {Icon ? (
                  <Icon className="w-3.5 h-3.5 text-foreground" />
                ) : item.status === "completed" ? (
                  <div className="w-2 h-2 rounded-full bg-accent" />
                ) : item.status === "current" ? (
                  <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-muted" />
                )}
              </div>
              {!isLast && (
                <div className={cn(
                  "w-px flex-1 min-h-[24px]",
                  item.status === "completed" ? "bg-accent/20" : "bg-border"
                )} />
              )}
            </div>

            {/* Content */}
            <div className={cn("pb-6", isLast && "pb-0")}>
              <div className="text-sm font-medium text-foreground">{item.title}</div>
              {item.description && (
                <p className="text-xs text-muted-2 mt-0.5">{item.description}</p>
              )}
              {item.date && (
                <span className="text-[10px] text-muted font-mono">{item.date}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
