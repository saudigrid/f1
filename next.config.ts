import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,

  images: {
    /**
     * قائمة صريحة لا `**`.
     *
     * `next/image` يجلب الصورة عبر خادمنا ثم يعيد تحجيمها. السماح بأي نطاق
     * يعني أن أي شخص يستطيع تمرير رابط صورته عبر مسار `/_next/image` عندنا،
     * فيستهلك عرض النطاق وحصة تحويل الصور على Vercel — وهي مدفوعة.
     *
     * كل نطاق هنا مرتبط بمزوّد في src/lib/images. إضافة مزوّد جديد تتطلب
     * إضافة نطاقه هنا أيضاً — وهذا مقصود: خطوتان لا واحدة.
     */
    remotePatterns: [
      // ويكيميديا كومنز — الصور الاحتياطية بتراخيص مفتوحة
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'thumb.wikimedia.org' },

      // شبكة Motorsport — بموجب الاتفاقية.
      // الصلاحية نفسها في src/lib/images/licensed-feed.ts؛ هذه سماح شبكي فقط.
      { protocol: 'https', hostname: '**.motorsport.com' },
      { protocol: 'https', hostname: '**.autosport.com' },

      // تخزين Supabase — للصور التي نرفعها بأنفسنا
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },

  experimental: {
    // three.js يُحمّل ديناميكياً في مكوّن الهيرو وحده
    optimizePackageImports: ['three'],
  },

  /**
   * ترويسات الأمان.
   *
   * ⚠️ `frame-ancestors 'none'` ليس تزيّناً: لوحة المراجعة في `/admin` فيها
   * أزرار «انشر» و«ارفض» تعمل بنقرة واحدة. بلا هذه الترويسة يستطيع موقع خبيث
   * أن يضع الصفحة في إطار شفّاف ويخدع محرّراً مسجّلاً ليضغط «انشر» على خبر
   * يختاره المهاجم — والنقرة تقع على أصلنا فتمرّ من فحص Next لمصدر الإجراء.
   *
   * نضع `X-Frame-Options` معها لأن متصفّحات أقدم لا تفهم `frame-ancestors`.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            // سنتان مع النطاقات الفرعية — يمنع أول زيارة عبر HTTP من أن تُعترَض
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // لا نستخدم أياً من هذه، فنغلقها صراحةً
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
};

export default config;
