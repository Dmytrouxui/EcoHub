"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AuthProfile =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; name: string; avatarUrl: string | null };

// Who is signed in (and their name and photo). Updates when they sign in, sign out or edit their profile.
export function useAuthProfile(): AuthProfile {
  const [state, setState] = useState<AuthProfile>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load(userId: string | null, email?: string | null) {
      if (!userId) {
        if (!cancelled) setState({ status: "signedOut" });
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      const name =
        data?.display_name ||
        [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
        email ||
        "My account";
      setState({ status: "signedIn", name, avatarUrl: data?.avatar_url ?? null });
    }

    supabase.auth.getUser().then(({ data }) => load(data.user?.id ?? null, data.user?.email));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Run outside the auth callback so it can't block Supabase
      setTimeout(() => load(session?.user?.id ?? null, session?.user?.email), 0);
    });

    // Re-read the name and photo after the profile page saves
    const refresh = () => supabase.auth.getUser().then(({ data: d }) => load(d.user?.id ?? null, d.user?.email));
    window.addEventListener("profile-updated", refresh);

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
      window.removeEventListener("profile-updated", refresh);
    };
  }, []);

  return state;
}
