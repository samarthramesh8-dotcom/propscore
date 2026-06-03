import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages that never need an auth check — return immediately.
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/demo",   // guest / demo routes — no auth required
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Skip Supabase entirely for public pages ────────────────────────────
  // Previously getUser() ran before the path check, causing every public page
  // to wait for a Supabase round-trip (could be 30+ seconds when project is
  // paused or network is slow). Public pages don't need auth — bail out early.
  if (isPublic(pathname)) {
    return NextResponse.next({ request });
  }

  // ── 2. Protected pages: check auth with a 5-second timeout ───────────────
  // Wrap everything in try/catch — if env vars are missing or Supabase is
  // unreachable, treat as unauthenticated rather than letting the error
  // propagate and cause a 500 on every protected route.
  let supabaseResponse = NextResponse.next({ request });
  let user = null;

  try {
    const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error("[proxy] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const supabase = createServerClient(url, key, {
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
    });

    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 5000)
    );
    const authResult = await Promise.race([
      supabase.auth.getUser().then((r) => r.data.user),
      timeout,
    ]);
    user = authResult;
  } catch {
    // Network error, invalid key, or paused project — treat as logged out.
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
