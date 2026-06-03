import { cn } from "@/lib/utils";
import { type HTMLAttributes } from "react";

type Tone = "accent" | "success" | "warning" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "badge",
        tone === "accent" && "badge-accent",
        tone === "success" && "badge-success",
        tone === "warning" && "badge-warning",
        tone === "neutral" && "badge-neutral",
        className
      )}
      {...rest}
    />
  );
}
