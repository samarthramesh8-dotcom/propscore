import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that never need an auth check — return immediately.
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Skip Supabase entirely for public pages ────────────────────────────
  // Previously getUser() ran before the path check, causing every public page
  // to wait for a Supabase round-trip (could be 30+ seconds when project is
  // paused or network is slow). Public pages don't need auth — bail out early.
  if (isPublic(pathname)) {
    return NextResponse.next({ request });
  }

  // ── 2. Protected pages: check auth with a 5-second timeout ───────────────
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Race getUser() against a 5-second timeout so a slow/paused Supabase
  // project doesn't hang the entire request. On timeout, treat as logged out.
  let user = null;
  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 5000)
    );
    const authResult = await Promise.race([
      supabase.auth.getUser().then((r) => r.data.user),
      timeout,
    ]);
    user = authResult;
  } catch {
    // Network error — treat as unauthenticated, redirect to login.
    user = null;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
