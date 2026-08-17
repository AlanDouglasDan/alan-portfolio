import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm border font-sans " +
  "transition-[background-color,border-color,color,transform] duration-150 " +
  "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 " +
  "disabled:active:translate-y-0";

const VARIANT: Record<Variant, string> = {
  primary:
    "border-signal bg-signal text-paper hover:brightness-110",
  secondary:
    "border-rule bg-paper-raised text-ink hover:border-ink-faint hover:bg-paper-sunk",
  ghost: "border-transparent bg-transparent text-ink-soft hover:text-ink",
  // Reserved for the tamper control, which is the only destructive action.
  danger:
    "border-debit/40 bg-debit-wash text-debit hover:border-debit",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-body-s",
  md: "px-4 py-2.5 text-body-s",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
