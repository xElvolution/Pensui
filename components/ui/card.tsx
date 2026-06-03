import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glass?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hover, glass, className, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          glass ? "card-glass p-6" : "card",
          hover && "card-hover cursor-pointer",
          className
        )}
        {...rest}
      />
    );
  }
);

Card.displayName = "Card";
