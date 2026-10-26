import Image from "next/image";
import Link from "next/link";
import styles from "./Logo.module.css";

type LogoProps = {
  /** Extra class to size the logo (set the height; width follows the logo's ratio) */
  className?: string;
};

// The logo file is 131x58. Only the height is set in CSS, so the ratio stays intact.
export function Logo({ className }: LogoProps) {
  return (
    <Link href="/" className={`${styles.logo} ${className ?? ""}`} aria-label="EcoHub home">
      <Image src="/logo.svg" alt="" width={131} height={58} priority unoptimized />
    </Link>
  );
}
