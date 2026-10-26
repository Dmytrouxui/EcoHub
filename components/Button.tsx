import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Stretch to the full width of the parent (default for forms) */
  fullWidth?: boolean;
  /** "primary" is the yellow button, "secondary" is the outlined one */
  variant?: "primary" | "secondary";
};

export function buttonClasses(variant: "primary" | "secondary", fullWidth: boolean, extra?: string) {
  return [styles.button, variant === "secondary" ? styles.secondary : "", fullWidth ? styles.fullWidth : "", extra ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  fullWidth = false,
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClasses(variant, fullWidth, className)} {...props}>
      {children}
    </button>
  );
}
