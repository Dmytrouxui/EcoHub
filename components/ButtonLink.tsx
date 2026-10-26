import Link from "next/link";
import type { ComponentProps } from "react";
import { buttonClasses } from "./Button";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  fullWidth?: boolean;
  variant?: "primary" | "secondary";
};

/** A link that looks like a Button (same sizes and styles) */
export function ButtonLink({
  fullWidth = false,
  variant = "primary",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, fullWidth, className)} {...props} />;
}
