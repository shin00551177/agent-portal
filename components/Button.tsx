"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT: Record<Variant, string> = {
  primary:   "bg-[#2E2E2E] hover:bg-[#181818] text-white disabled:opacity-50",
  secondary: "bg-[#F5F5F5] hover:bg-[#EBEBEB] text-[#969696] hover:text-[#2E2E2E] border border-[#E6E3E3] disabled:opacity-50",
  danger:    "bg-[rgba(233,62,33,0.05)] hover:bg-red-100 text-[#E93E21] disabled:opacity-50",
};

const SIZE: Record<Size, string> = {
  sm: "px-4  py-1.5 text-[12px]",
  md: "px-5  py-2   text-[13px]",
  lg: "px-6  py-3   text-[15px]",
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
        rounded-full font-medium transition-colors active:scale-[.98]
        ${VARIANT[variant]}
        ${SIZE[size]}
        ${className}
      `.replace(/\s+/g, " ").trim()}
    >
      {children}
    </button>
  );
}
