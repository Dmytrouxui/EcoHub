"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthProfile } from "@/lib/useAuthProfile";
import styles from "./UserMenu.module.css";

// The account button in the header. Opens a small menu on hover, tap or keyboard:
// signed out: Sign in, Sign up. Signed in: Feed, My Profile, Sign out.
export function UserMenu({ auth }: { auth: AuthProfile }) {
  const router = useRouter();
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const openedByHover = useRef(false);
  const [open, setOpen] = useState(false);
  const signedIn = auth.status === "signedIn";

  // Close with Escape or a click outside
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // Hover works with a mouse only. On a touch screen a tap opens and closes the menu.
  function openOnHover() {
    clearTimeout(closeTimer.current);
    openedByHover.current = true;
    setOpen(true);
  }

  function toggle() {
    // A mouse click right after hovering shouldn't close the menu that hovering just opened
    if (openedByHover.current) {
      openedByHover.current = false;
      return;
    }
    setOpen((value) => !value);
  }

  function closeOnLeave() {
    openedByHover.current = false;
    // A short delay so the menu doesn't vanish while the mouse crosses the small gap
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  async function signOut() {
    setOpen(false);
    await createClient().auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      onPointerEnter={(event) => event.pointerType === "mouse" && openOnHover()}
      onPointerLeave={(event) => event.pointerType === "mouse" && closeOnLeave()}
    >
      <button
        type="button"
        className={`${styles.button} ${signedIn ? styles.buttonProfile : ""}`}
        aria-label={signedIn ? `${auth.name}, account menu` : "My account"}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={toggle}
      >
        {signedIn ? (
          <>
            <span className={styles.name}>{auth.name}</span>
            {auth.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={auth.avatarUrl} alt="" className={styles.avatar} />
            ) : (
              <span className={`${styles.avatar} ${styles.avatarEmpty}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/avatar-placeholder.svg" alt="" />
              </span>
            )}
          </>
        ) : (
          <Image src="/icons/account.svg" alt="" width={32} height={32} unoptimized />
        )}
      </button>

      <div id={menuId} className={`${styles.panel} ${open ? styles.panelOpen : ""}`}>
        <ul className={styles.list}>
          {signedIn ? (
            <>
              <li>
                <Link href="/feed" className={styles.item} onClick={() => setOpen(false)}>
                  Feed
                </Link>
              </li>
              <li>
                <Link href="/profile" className={styles.item} onClick={() => setOpen(false)}>
                  My Profile
                </Link>
              </li>
              <li>
                <button type="button" className={styles.item} onClick={signOut}>
                  Sign out
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link href="/sign-in" className={styles.item} onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className={styles.item} onClick={() => setOpen(false)}>
                  Sign up
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
