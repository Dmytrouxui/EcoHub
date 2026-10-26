import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// The link in the password reset email lands here.
// It checks the link with Supabase, then sends the user to the "new password" page.
// Handles both link types Supabase can send:
//   ?token_hash=...&type=recovery  (our email template)
//   ?code=...                      (Supabase's default email template)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Only allow sending the user to a page on this site
  const nextParam = searchParams.get("next") ?? "/reset-password";
  const nextPath = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/reset-password";

  const failed = request.nextUrl.clone();
  failed.pathname = "/forgot-password/expired";
  failed.search = "";

  if (!code && !(tokenHash && type === "recovery")) return NextResponse.redirect(failed);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: type!, token_hash: tokenHash! });
  if (error) return NextResponse.redirect(failed);

  const next = request.nextUrl.clone();
  next.pathname = nextPath;
  next.search = "";
  return NextResponse.redirect(next);
}
