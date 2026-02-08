// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Lấy cookie
  const authToken = request.cookies.get("auth_token");

  // Nếu đã có token, cho đi qua
  if (authToken) {
    return NextResponse.next();
  }

  // Nếu chưa có token, chuyển hướng về trang login
  return NextResponse.redirect(new URL("/login", request.url));
}

// Cấu hình: Chặn tất cả, TRỪ trang login và các file tĩnh (ảnh, api login)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login (trang đăng nhập)
     * - api/auth (api xử lý đăng nhập)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};