import { cn } from "@/lib/utils";

interface PanelProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  noPadding?: boolean;
}

export function Panel({ title, description, actions, className, children, noPadding }: PanelProps) {
  return (
    <div className={cn("rounded-xl bg-surface border border-border overflow-hidden", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && <p className="text-xs text-muted-2 mt-0.5">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>
        {children}
      </div>
    </div>
  );
}
