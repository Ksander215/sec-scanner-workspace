import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/Container";

interface SectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function Section({ title, description, children, className, actions }: SectionProps) {
  return (
    <section className={cn("py-6", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h2 className="text-lg font-bold text-foreground">{title}</h2>}
            {description && <p className="text-sm text-muted-2 mt-0.5">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
