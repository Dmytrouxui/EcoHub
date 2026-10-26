"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import styles from "./HeaderPopover.module.css";

type HeaderPopoverProps = {
  label: string;
  icon: ReactNode;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Number of new items, shown as a small red badge */
  badge?: number;
  children: ReactNode;
};

// Small icon button in the header with a panel under it
export function HeaderPopover({ label, icon, title, open, onOpenChange, badge = 0, children }: HeaderPopoverProps) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        aria-label={badge > 0 ? `${label}, ${badge} new` : label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
      >
        {icon}
        {badge > 0 ? <span className={styles.badge}>{badge > 9 ? "9+" : badge}</span> : null}
      </button>
      <div id={id} className={`${styles.panel} ${open ? styles.panelOpen : ""}`}>
        <p className={styles.title}>{title}</p>
        {children}
      </div>
    </div>
  );
}
