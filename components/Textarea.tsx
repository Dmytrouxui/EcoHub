import { useId } from "react";
import type { Ref, TextareaHTMLAttributes } from "react";
import styles from "./Textarea.module.css";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Accessible label (visually hidden, like the Input) */
  label: string;
  error?: string;
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({ label, error, id, className, ref, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const errorId = `${textareaId}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={textareaId} className="sr-only">
        {label}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        className={`${styles.textarea} ${className ?? ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
