import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    // Lấy pass từ .env, nếu chưa cấu hình thì dùng tạm chuỗi fix cứng để test
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (password === adminPassword) {
      // 1. Tạo response thành công trước
      const response = NextResponse.json({ success: true });

      // 2. Set cookie trực tiếp vào response này
      response.cookies.set("auth_token", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30, // 30 ngày
        path: "/",
      });

      // 3. Trả về response đã có cookie
      return response;
    }

    return NextResponse.json({ success: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}