import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "اتصل بنا",
  description: "للتبليغ عن خطأ في خبر، أو للاستفسارات الإعلانية والتحريرية.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="page max-w-3xl py-12">
      <h1 className="font-display text-3xl font-black">
        <span className="speedbar" aria-hidden />
        اتصل بنا
      </h1>

      <div className="prose-ar mt-8">
        <p>
          نرحّب بالتصحيحات والملاحظات والاستفسارات الإعلانية. ضع بريدك الفعلي هنا قبل إطلاق
          الموقع.
        </p>
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "تصحيح خبر", value: "corrections@example.com" },
          { label: "استفسارات تحريرية", value: "editor@example.com" },
          { label: "الإعلانات", value: "ads@example.com" },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <dt className="text-xs text-text-faint">{item.label}</dt>
            <dd className="numeric mt-1.5 text-sm break-all">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
