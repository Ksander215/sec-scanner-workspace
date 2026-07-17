"use client";

import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { key: string; label: string; icon?: React.ElementType }[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeKey, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-border w-fit", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              activeKey === tab.key
                ? "bg-accent text-background"
                : "text-muted-2 hover:text-foreground"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
