"use client";

import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import styles from "./TagInput.module.css";

type TagInputProps = {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  max?: number;
  placeholder?: string;
};

// Interest tags: type to search the suggestions, or press Enter to add your own.
export function TagInput({ label, value, onChange, suggestions, max = 10, placeholder }: TagInputProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const taken = new Set(value.map((t) => t.toLowerCase()));
  const query = text.trim().toLowerCase();
  const matches = suggestions
    .filter((s) => !taken.has(s.toLowerCase()) && s.toLowerCase().includes(query))
    .slice(0, 6);

  function add(raw: string) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag) return;
    if (tag.length > 30) return setMessage("Tags can be up to 30 characters.");
    if (taken.has(tag.toLowerCase())) return setMessage("You already added that tag.");
    if (value.length >= max) return setMessage(`You can add up to ${max} tags.`);
    setMessage("");
    onChange([...value, tag]);
    setText("");
  }

  function remove(tag: string) {
    setMessage("");
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault(); // Enter adds a tag, it doesn't submit the form
      add(text);
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Backspace" && !text && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.searchBox}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          id={id}
          className={styles.input}
          value={text}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={30}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setMessage("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
        />

        {open && matches.length > 0 ? (
          <ul className={styles.suggestions}>
            {matches.map((s) => (
              <li key={s}>
                <button type="button" className={styles.suggestion} onMouseDown={(e) => e.preventDefault()} onClick={() => add(s)}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {message ? (
        <p className={styles.message} role="status">
          {message}
        </p>
      ) : null}

      {value.length > 0 ? (
        <ul className={styles.chips} aria-label="Your tags">
          {value.map((tag) => (
            <li key={tag} className={styles.chip}>
              <button type="button" className={styles.remove} onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>
                ×
              </button>
              <span>{tag}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
