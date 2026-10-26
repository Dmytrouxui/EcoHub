"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { TagInput } from "@/components/TagInput";
import { Textarea } from "@/components/Textarea";
import { createClient } from "@/lib/supabase/client";
import styles from "./profile.module.css";

type Initial = {
  firstName: string;
  lastName: string;
  displayName: string;
  location: string;
  tags: string[];
  bio: string;
  avatarUrl: string | null;
};

type Errors = {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  location?: string;
  bio?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BIO_MAX = 300;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Starting ideas for the tags (people can also type their own)
const tagSuggestions = [
  "Eco hub",
  "Save planet",
  "Zero waste",
  "Recycling",
  "Sustainable lifestyle",
  "Eco events",
  "European wildlife",
  "Renewable energy",
  "Urban gardening",
  "Cycling",
  "Climate action",
  "Plant-based food",
];

export function ProfileForm({ userId, email, initial }: { userId: string; email: string; initial: Initial }) {
  const router = useRouter();
  const [photo, setPhoto] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [tags, setTags] = useState(initial.tags);
  const [bio, setBio] = useState(initial.bio);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const displayName = String(data.get("displayName") ?? "").trim();
    const newEmail = String(data.get("email") ?? "").trim();
    const location = String(data.get("location") ?? "").trim();

    const nextErrors: Errors = {};
    if (!firstName) nextErrors.firstName = "Enter your first name.";
    if (!lastName) nextErrors.lastName = "Enter your last name.";
    if (displayName.length > 50) nextErrors.displayName = "Use up to 50 characters.";
    if (!newEmail) nextErrors.email = "Enter your email.";
    else if (!emailPattern.test(newEmail)) nextErrors.email = "Enter a valid email address.";
    if (location.length > 100) nextErrors.location = "Use up to 100 characters.";
    if (bio.length > BIO_MAX) nextErrors.bio = `Use up to ${BIO_MAX} characters.`;

    setErrors(nextErrors);
    setFormError("");
    setSuccess("");
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const supabase = createClient();
    let nextAvatar = avatarUrl;

    // 1. New profile picture
    if (photo) {
      const path = `${userId}/avatar-${Date.now()}.${extensions[photo.type]}`;
      const upload = await supabase.storage.from("avatars").upload(path, photo, { contentType: photo.type });
      if (upload.error) {
        setLoading(false);
        setFormError("We couldn’t upload your picture. Please try again.");
        return;
      }
      nextAvatar = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;

      // Tidy up: remove the previous picture
      const oldPath = avatarUrl?.split("/avatars/")[1];
      if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
    }

    // 2. Profile details
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        display_name: displayName || null,
        location: location || null,
        tags,
        bio: bio.trim() || null,
        avatar_url: nextAvatar,
      })
      .eq("id", userId);

    if (error) {
      setLoading(false);
      setFormError("We couldn’t save your profile. Please try again in a moment.");
      return;
    }

    // 3. Email (only when it was changed)
    let message = "Your profile has been saved.";
    if (newEmail.toLowerCase() !== email.toLowerCase()) {
      const { data: updated, error: emailError } = await supabase.auth.updateUser({ email: newEmail });
      if (emailError) {
        setLoading(false);
        setErrors({
          email:
            emailError.code === "email_exists"
              ? "That email is already used by another account."
              : "We couldn’t change your email. Please try again.",
        });
        setSuccess("Your other changes have been saved.");
        router.refresh();
        return;
      }
      if (updated.user?.new_email) {
        message = "Your profile has been saved. We sent a link to your new email, so please confirm it to finish changing your address.";
      }
    }

    setAvatarUrl(nextAvatar);
    setPhoto(null);
    setLoading(false);
    setSuccess(message);
    router.refresh(); // updates the name and photo in the menu
    window.dispatchEvent(new Event("profile-updated")); // and in the header
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.top}>
        <div className={styles.photoColumn}>
          <h2 className={styles.label}>Profile image</h2>
          <AvatarPicker variant="round" photo={photo} onChange={setPhoto} currentUrl={avatarUrl} />
        </div>

        <div className={styles.fields}>
          <Input label="First name" name="firstName" autoComplete="given-name" defaultValue={initial.firstName} error={errors.firstName} />
          <Input label="Last name" name="lastName" autoComplete="family-name" defaultValue={initial.lastName} error={errors.lastName} />

          <div className={styles.group}>
            <p className={styles.hint} id="display-name-hint">
              Display name: this is how your name will be shown to other members.
            </p>
            <Input
              label="Display name"
              name="displayName"
              autoComplete="nickname"
              defaultValue={initial.displayName}
              placeholder="How would you like to be shown?"
              aria-describedby="display-name-hint"
              error={errors.displayName}
            />
          </div>

          <Input label="Email" name="email" type="email" autoComplete="email" defaultValue={email} error={errors.email} />
          <Input
            label="Location"
            name="location"
            autoComplete="address-level2"
            defaultValue={initial.location}
            placeholder="Location (city, country)"
            error={errors.location}
          />
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.group}>
          <h2 className={styles.label}>Tags</h2>
          <TagInput label="Add a tag" value={tags} onChange={setTags} suggestions={tagSuggestions} placeholder="Type area of interest" />
        </div>

        <div className={styles.group}>
          <h2 className={styles.label}>Bio</h2>
          <Textarea
            label="Bio"
            name="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX}
            placeholder="Tell the community a little about yourself"
            error={errors.bio}
          />
          <p className={styles.counter}>
            {bio.length}/{BIO_MAX}
          </p>
        </div>
      </div>

      <div className={styles.save}>
        {formError ? (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        ) : null}
        {success ? (
          <p className={styles.success} role="status">
            {success}
          </p>
        ) : null}
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
