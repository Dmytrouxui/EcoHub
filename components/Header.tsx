"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { Logo } from "./Logo";
import { MessagesLink } from "./MessagesLink";
import { NotificationsBell } from "./NotificationsBell";
import { UserMenu } from "./UserMenu";
import { useAuthProfile } from "@/lib/useAuthProfile";
import { navLinks } from "./nav-links";
import styles from "./Header.module.css";

export function Header() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const auth = useAuthProfile();

  // Close the mobile menu with Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Logo className={styles.logo} />

        <nav
          id={menuId}
          aria-label="Main"
          className={`${styles.nav} ${open ? styles.navOpen : ""}`}
        >
          <ul className={styles.list}>
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className={styles.link} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          {auth.status === "signedIn" ? (
            <>
              <MessagesLink />
              <NotificationsBell />
            </>
          ) : null}
          <UserMenu auth={auth} />

          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span className={styles.burger} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
