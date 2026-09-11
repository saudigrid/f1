import { NextResponse, type NextRequest } from "next/server";

/**
 * حماية لوحة المراجعة.
 *
 * مصادقة HTTP الأساسية كافية هنا: اللوحة داخلية، لمستخدم واحد، ولا تحتوي
 * بيانات مستخدمين. عند إضافة محررين آخرين يُستبدل هذا بمصادقة Supabase.
 *
 * إن لم يُضبط ADMIN_PASSWORD تُغلق اللوحة بالكامل بدل أن تُترك مفتوحة.
 */
export function middleware(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return new NextResponse("لوحة المراجعة معطّلة — اضبط ADMIN_PASSWORD.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const supplied = decoded.slice(decoded.indexOf(":") + 1);
      if (timingSafeEqual(supplied, password)) return NextResponse.next();
    } catch {
      // ترويسة مشوّهة — تُعامل كمحاولة فاشلة
    }
  }

  return new NextResponse("مطلوب تسجيل الدخول", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Saudi F1 Grid Admin", charset="UTF-8"',
    },
  });
}

/** مقارنة بزمن ثابت — تمنع استنتاج كلمة المرور من فروق التوقيت. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
