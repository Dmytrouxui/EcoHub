"use client";

import { ButtonLink } from "@/components/ButtonLink";
import { useAuthProfile } from "@/lib/useAuthProfile";
import styles from "./landing.module.css";

/** Landing buttons: visitors see "Join" (+ "Sign in"), signed-in members see a link to the community */
export function JoinActions({
  label,
  showSignIn = false,
  inline = false,
}: {
  label: string;
  showSignIn?: boolean;
  inline?: boolean;
}) {
  const auth = useAuthProfile();
  const signedIn = auth.status === "signedIn";

  return (
    <div className={inline ? styles.actionsInline : styles.actions}>
      <ButtonLink href={signedIn ? "/feed" : "/sign-up"}>
        {signedIn ? "Go to the community" : label}
      </ButtonLink>
      {showSignIn && !signedIn ? (
        <ButtonLink href="/sign-in" variant="secondary">
          Sign in
        </ButtonLink>
      ) : null}
    </div>
  );
}
