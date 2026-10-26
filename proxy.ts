import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that need a signed-in user, and where to send visitors who aren't
const protectedPaths: Record<string, string> = {
  "/account": "/sign-in",
  "/profile": "/sign-in",
  "/feed": "/sign-in",
  "/dashboard": "/sign-in",
  "/settings": "/sign-in",
  "/messages": "/sign-in",
  "/members": "/sign-in",
  "/reset-password": "/forgot-password", // only reachable from the link in the reset email
};
// Pages a signed-in user doesn't need to see again
const guestOnlyPaths = ["/sign-in", "/sign-up", "/forgot-password"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Checks the login with Supabase and refreshes it when it has expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // If Supabase sends a reset link to the home page, pass it on to /auth/confirm
  if (path === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    url.searchParams.set("next", "/reset-password");
    return NextResponse.redirect(url);
  }

  const redirectTo = Object.entries(protectedPaths).find(([p]) => path.startsWith(p))?.[1];
  if (!user && redirectTo) {
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    return NextResponse.redirect(url);
  }

  if (user && guestOnlyPaths.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
