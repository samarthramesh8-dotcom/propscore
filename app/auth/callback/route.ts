import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

function noCache(r: NextResponse) {
  r.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return r;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const oauthErrorDesc = searchParams.get("error_description");
  const type = searchParams.get("type"); // "recovery" for password reset

  const isRecovery = type === "recovery";

  // Supabase/Google sends error params when OAuth fails (e.g. user denied, bad config).
  if (oauthError) {
    console.error("[auth/callback] OAuth error:", oauthError, oauthErrorDesc);
    const desc = oauthErrorDesc ? encodeURIComponent(oauthErrorDesc) : "";
    if (isRecovery) {
      return noCache(NextResponse.redirect(`${origin}/forgot-password?error=expired`));
    }
    return noCache(
      NextResponse.redirect(
        `${origin}/login?error=auth${desc ? `&error_description=${desc}` : ""}`
      )
    );
  }

  const redirectUrl = isRecovery ? `${origin}/reset-password` : `${origin}/dashboard`;

  // Build the redirect response first so we can stamp cookies onto it.
  const response = NextResponse.redirect(redirectUrl);

  if (code) {
    // Log first 6 chars to distinguish Google codes (4/0A…) from Supabase PKCE codes.
    console.log("[auth/callback] code prefix:", code.slice(0, 6));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          // @supabase/ssr 0.10+ passes cache-control headers as the second arg.
          setAll(cookiesToSet, responseHeaders) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
            if (responseHeaders) {
              Object.entries(responseHeaders).forEach(([k, v]) =>
                response.headers.set(k, v as string)
              );
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
      if (isRecovery) {
        return noCache(NextResponse.redirect(`${origin}/forgot-password?error=expired`));
      }
      return noCache(
        NextResponse.redirect(
          `${origin}/login?error=auth&error_description=${encodeURIComponent(error.message)}`
        )
      );
    }
  }

  return noCache(response);
}
