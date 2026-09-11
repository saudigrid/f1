import Link from "next/link";
import type { Metadata } from "next";
import { site } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "عن الموقع",
  description: `${site.name} — منصة عربية مستقلة لتغطية رياضة الفورمولا 1 عالمياً.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="page max-w-3xl py-12">
      <h1 className="font-display text-3xl font-black">
        <span className="speedbar" aria-hidden />
        عن الموقع
      </h1>

      <div className="prose-ar mt-8">
        <p>
          <strong>{site.name}</strong> منصة عربية مستقلة تغطي رياضة الفورمولا 1 عالمياً: كل
          الجولات، كل الفرق، كل السائقين — من التجارب الحرة إلى منصة التتويج، ومن قرارات
          لجنة المشرفين إلى تفاصيل التطويرات الهوائية.
        </p>

        <p>
          الاسم سعودي والمنشأ سعودي، لكن التغطية ليست محلية. جائزة السعودية الكبرى على حلبة
          كورنيش جدة لها قسمها الخاص كأي جولة أخرى، لا كمحور للموقع.
        </p>

        <h2>لماذا هذا الموقع</h2>
        <p>
          المتابع العربي للفورمولا 1 مضطر غالباً للقراءة بالإنجليزية أو الاكتفاء بترجمات
          متأخرة وغير دقيقة. نحاول سد هذه الفجوة بمحتوى عربي سريع ومكتوب بمصطلحات صحيحة،
          مع تدقيق حقيقي قبل النشر.
        </p>

        <h2>كيف نعمل</h2>
        <p>
          نرصد الحدث من عدة مصادر متخصصة، ونعيد تحريره بصياغة عربية أصلية، ثم يمر بمرحلة
          تدقيق تفحص كل ادعاء واقعي فيه قبل أن يُنشر. التفاصيل الكاملة في{" "}
          <Link href="/editorial-policy">السياسة التحريرية</Link>.
        </p>

        <h2>إشعار</h2>
        <p>
          هذا الموقع غير تابع لـ Formula 1 أو Formula One World Championship Limited أو
          الاتحاد الدولي للسيارات (FIA) أو أي فريق مشارك. جميع العلامات التجارية والأسماء
          المذكورة ملك أصحابها.
        </p>
      </div>
    </div>
  );
}
