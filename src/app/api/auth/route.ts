// app/api/auth/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  // So sánh với mật khẩu trong .env
  if (password === process.env.ADMIN_PASSWORD) {
    // Nếu đúng, tạo cookie tên là "auth_token"
    cookies().set("auth_token", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // Lưu trong 30 ngày
      path: "/",
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false }, { status: 401 });
}