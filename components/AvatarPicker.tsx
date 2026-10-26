"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import styles from "./AvatarPicker.module.css";

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

type AvatarPickerProps = {
  photo: File | null;
  onChange: (file: File | null) => void;
  /** "card" is the big box on the sign up page, "round" is the circle on the profile page */
  variant?: "card" | "round";
  /** Picture the user already has (shown until they choose a new one) */
  currentUrl?: string | null;
};

// Profile picture upload: placeholder (or preview) with "Add photo" under it.
export function AvatarPicker({ photo, onChange, variant = "card", currentUrl }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  // Show a preview of the chosen picture
  useEffect(() => {
    if (!photo) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets the user pick the same file again
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP picture.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setError("The picture is too big. Please choose one under 2 MB.");
      return;
    }

    setError("");
    onChange(file);
  }

  function remove() {
    setError("");
    onChange(null);
  }

  function choose() {
    inputRef.current?.click();
  }

  return (
    <div className={`${styles.picker} ${variant === "round" ? styles.round : ""}`}>
      <div className={styles.box}>
        {previewUrl || currentUrl ? (
          // A temporary preview of the file the user picked, so a plain <img> is the right tool
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl || currentUrl || ""} alt="Your profile picture" className={styles.preview} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/icons/avatar-placeholder.svg" alt="" className={styles.placeholder} />
        )}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.action} onClick={choose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M4 16l4-4 3 3m3-6.5h.01M18 15v6m-3-3h6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{photo || currentUrl ? "Change photo" : "Add photo"}</span>
        </button>
        {photo ? (
          <button type="button" className={styles.action} onClick={remove}>
            <span>Remove</span>
          </button>
        ) : null}
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        className="sr-only"
        onChange={handleChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
