import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";

type Variant = "primary" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      ...rest
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "btn",
          variant === "primary" && "btn-primary",
          variant === "ghost" && "btn-ghost",
          size === "sm" && "btn-sm",
          size === "lg" && "btn-lg",
          className
        )}
        {...rest}
      >
        {loading ? (
          <span className="inline-flex w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
