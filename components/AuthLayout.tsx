import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./AuthLayout.module.css";

type AuthLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Replaces the photo on the left (e.g. the profile picture upload on the sign up page) */
  aside?: ReactNode;
};

// Shared layout for the sign in and password pages:
// photo on the left (desktop only), heading + form on the right.
export function AuthLayout({ title, subtitle, children, aside }: AuthLayoutProps) {
  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.layout}>
        {aside ? <div className={styles.aside}>{aside}</div> : null}

        {/* Photo: shown only when there is room for two columns */}
        {!aside ? <div className={styles.photo}>
          <Image
            src="/images/login-volunteers.jpg"
            alt="Volunteers planting young trees by a lake at golden hour"
            fill
            sizes="416px"
            priority
            unoptimized
            className={styles.photoImage}
          />
        </div> : null}

        <div className={styles.panel}>
          <div className={styles.intro}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
