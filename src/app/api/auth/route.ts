import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, createAuthToken } from "@/lib/authSession";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json({ success: false, error: "Server auth is not configured" }, { status: 500 });
    }

    if (password === adminPassword) {
      const response = NextResponse.json({ success: true });
      const authToken = await createAuthToken();

      response.cookies.set(AUTH_COOKIE_NAME, authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: "/",
      });

      return response;
    }

    return NextResponse.json({ success: false }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
