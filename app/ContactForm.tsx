"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { createClient } from "@/lib/supabase/client";
import styles from "./landing.module.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = { name?: string; email?: string; message?: string };

/** Contact form on the landing page. Messages are saved in Supabase (table contact_messages). */
export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    // Hidden field: real people leave it empty, simple bots fill it in
    if (String(data.get("website") ?? "")) return setSent(true);

    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const next: Errors = {};
    if (!name) next.name = "Enter your name.";
    if (!email) next.email = "Enter your email.";
    else if (!emailPattern.test(email)) next.email = "Enter a valid email address.";
    if (!message) next.message = "Write a short message.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    setFormError("");
    const { error } = await createClient().from("contact_messages").insert({ name, email, message });
    setLoading(false);

    if (error) {
      setFormError("We couldn’t send your message right now. Please try again in a moment.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className={styles.sent} role="status">
        <strong>Thank you!</strong>
        Your message has been sent. We’ll get back to you by email.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Input label="Name" name="name" autoComplete="name" maxLength={80} error={errors.name} />
      <Input
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        maxLength={160}
        error={errors.email}
       
      />
      <Textarea label="Message" name="message" placeholder="Message" maxLength={2000} error={errors.message} />

      <div className={styles.honeypot} aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {formError ? (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
