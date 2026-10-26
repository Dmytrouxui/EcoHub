"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { createClient } from "@/lib/supabase/client";
import { extractTags, fetchPostById } from "@/lib/posts";
import type { Post } from "@/lib/posts";
import { Avatar } from "./Avatar";
import styles from "./feed.module.css";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_IMAGES = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const BODY_MAX = 2000;

type Picked = { file: File; url: string };

type PostComposerProps = {
  me: { id: string; avatarUrl: string | null };
  onCreated: (post: Post) => void;
};

// "What's on your mind?" box at the top of the feed. Opens into a small post form.
export function PostComposer({ me, onCreated }: PostComposerProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<Picked[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // The "Create a Post" button on the left opens this box
  useEffect(() => {
    const openBox = () => {
      setOpen(true);
      setTimeout(() => bodyRef.current?.focus(), 50);
    };
    window.addEventListener("open-composer", openBox);
    return () => window.removeEventListener("open-composer", openBox);
  }, []);

  // Free the memory used by the picture previews
  useEffect(() => {
    return () => images.forEach((img) => URL.revokeObjectURL(img.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const next = [...images];
    for (const file of files) {
      if (next.length >= MAX_IMAGES) {
        setError(`You can add up to ${MAX_IMAGES} pictures.`);
        break;
      }
      if (!TYPES.includes(file.type)) {
        setError("Please choose JPG, PNG or WebP pictures.");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError("A picture is too big. Please choose ones under 5 MB.");
        continue;
      }
      setError("");
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setImages(next);
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(images[index].url);
    setImages(images.filter((_, i) => i !== index));
    setError("");
  }

  function reset() {
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setImages([]);
    setTitle("");
    setBody("");
    setError("");
    setOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return setError("Write something to share.");
    if (text.length > BODY_MAX) return setError(`Posts can be up to ${BODY_MAX} characters.`);

    setLoading(true);
    setError("");
    const supabase = createClient();

    // 1. Upload the pictures
    const urls: string[] = [];
    for (const { file } of images) {
      const path = `${me.id}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
      const upload = await supabase.storage.from("post-images").upload(path, file, { contentType: file.type });
      if (upload.error) {
        setLoading(false);
        setError("We couldn’t upload a picture. Please try again.");
        return;
      }
      urls.push(supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl);
    }

    // 2. Save the post
    const { data, error: insertError } = await supabase
      .from("posts")
      .insert({
        author_id: me.id,
        title: title.trim() || null,
        body: text,
        image_urls: urls,
        tags: extractTags(text),
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setLoading(false);
      setError("We couldn’t publish your post. Please try again in a moment.");
      return;
    }

    const post = await fetchPostById(supabase, me.id, data.id);
    setLoading(false);
    if (post) onCreated(post);
    reset();
  }

  if (!open) {
    return (
      <div className={`${styles.card} ${styles.composerClosed}`} id="composer">
        <Avatar url={me.avatarUrl} size={40} />
        <button type="button" className={styles.composerPrompt} onClick={() => setOpen(true)}>
          What’s on your mind?
        </button>
      </div>
    );
  }

  return (
    <form className={`${styles.card} ${styles.composer}`} id="composer" onSubmit={handleSubmit} noValidate>
      <div className={styles.composerHead}>
        <Avatar url={me.avatarUrl} size={40} />
        <div className={styles.composerFields}>
          <Input label="Title (optional)" name="title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" />
          <Textarea
            ref={bodyRef}
            label="Your post"
            name="body"
            value={body}
            maxLength={BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share something with the community. Add #tags so others can find your post."
          />
        </div>
      </div>

      {images.length > 0 ? (
        <ul className={styles.previews}>
          {images.map((img, index) => (
            <li key={img.url} className={styles.preview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`Picture ${index + 1}`} />
              <button type="button" className={styles.previewRemove} onClick={() => removeImage(index)} aria-label={`Remove picture ${index + 1}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.composerActions}>
        <button type="button" className={styles.linkButton} onClick={() => fileRef.current?.click()} disabled={images.length >= MAX_IMAGES}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M4 16l4-4 3 3m3-6.5h.01M18 15v6m-3-3h6" />
          </svg>
          <span>Add pictures</span>
        </button>
        <span className={styles.counter}>
          {body.length}/{BODY_MAX}
        </span>
        <div className={styles.composerButtons}>
          <button type="button" className={styles.linkButton} onClick={reset} disabled={loading}>
            <span>Cancel</span>
          </button>
          <Button type="submit" disabled={loading}>
            {loading ? "Posting…" : "Post"}
          </Button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept={TYPES.join(",")} multiple className="sr-only" onChange={pickImages} tabIndex={-1} aria-hidden="true" />
    </form>
  );
}
