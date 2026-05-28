"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT: Record<Variant, string> = {
  primary:   "bg-[#1d1d1f] hover:bg-black text-white disabled:opacity-50",
  secondary: "bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#6e6e73] hover:text-[#1d1d1f] disabled:opacity-50",
  danger:    "bg-[#fff1f0] hover:bg-red-100 text-[#c0392b] disabled:opacity-50",
};

const SIZE: Record<Size, string> = {
  sm: "px-4 py-1.5 text-[12px]",
  md: "px-5 py-2   text-[13px]",
  lg: "px-6 py-3   text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl font-medium transition-colors
        ${VARIANT[variant]}
        ${SIZE[size]}
        ${className}
      `.replace(/\s+/g, " ").trim()}
    >
      {children}
    </button>
  );
}
