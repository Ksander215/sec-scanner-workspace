import { cn } from "@/lib/utils";

interface DataTableProps {
  headers: { label: string; className?: string }[];
  rows: React.ReactNode[][];
  className?: string;
}

export function DataTable({ headers, rows, className }: DataTableProps) {
  return (
    <div className={cn("rounded-xl bg-surface border border-border overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium",
                    h.className
                  )}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={cn("px-4 py-3 text-sm", headers[j]?.className)}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
