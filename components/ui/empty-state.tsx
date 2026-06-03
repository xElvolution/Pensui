import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-20 px-6",
        className
      )}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 blur-2xl bg-[color:var(--accent-glow)] rounded-full" />
        <div className="relative w-16 h-16 rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--card)] flex items-center justify-center text-[color:var(--accent-hover)]">
          {icon}
        </div>
      </div>
      <h3 className="text-h4 mb-2">{title}</h3>
      {description && (
        <p className="text-body max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}
