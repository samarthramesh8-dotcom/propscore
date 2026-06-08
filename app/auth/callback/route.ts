import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Supabase redirects here after email link clicks (password reset, email confirm, etc.)
// Exchanges the one-time code for a session, then sends the user to the right page.
//
// IMPORTANT: we must write the session cookies onto the *same* redirect response we return.
// Using createClient() (which writes to next/headers) drops cookies when we create a new
// NextResponse.redirect — so we instantiate createServerClient directly here.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "recovery" for password reset

  const isRecovery = type === "recovery";
  const redirectUrl = isRecovery ? `${origin}/reset-password` : `${origin}/dashboard`;

  // Build the redirect response first so we can stamp cookies onto it.
  const response = NextResponse.redirect(redirectUrl);

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Write session cookies directly onto our redirect response.
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Code is invalid or expired. For OAuth (Google) failures redirect to login;
      // for email recovery flows redirect to forgot-password.
      if (isRecovery) {
        return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
      }
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }
  }

  return response;
}
