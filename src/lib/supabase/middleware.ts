import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config/env";
import { sanitizeReturnUrl } from "@/lib/utils/redirects";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    config.supabase.url,
    config.supabase.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect /dashboard and all subroutes
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      url.searchParams.set("returnUrl", sanitizeReturnUrl(pathname));
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages to /dashboard
  if (
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/register") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    if (user) {
      const returnUrl = sanitizeReturnUrl(request.nextUrl.searchParams.get("returnUrl"));
      const url = request.nextUrl.clone();
      url.pathname = returnUrl;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
