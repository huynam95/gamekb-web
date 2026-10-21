import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/authSession";

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isValidSession = await verifyAuthToken(authToken);

  if (isValidSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // _next/image is deliberately NOT excluded: only signed-in users may use the image optimiser.
    "/((?!login|api/auth|_next/static|favicon.ico).*)",
  ],
};
