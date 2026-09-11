import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHeader } from '@/components/site/PageHeader';

export const metadata: Metadata = {
  title: 'عن الموقع',
  description: 'Saudi F1 Grid — منصة عربية مستقلة لتغطية رياضة الفورمولا 1 عالمياً.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHeader title="عن الموقع" />

      <div className="prose-ar">
        <p>
          <strong>Saudi F1 Grid</strong> منصة عربية مستقلة تغطي رياضة الفورمولا 1 عالمياً: كل
          الجولات، كل الفرق، كل السائقين — من التجارب الحرة إلى منصة التتويج، ومن قرارات لجنة
          المشرفين إلى تفاصيل التطويرات الهوائية.
        </p>

        <p>
          الاسم سعودي والمنشأ سعودي، لكن التغطية ليست محلية. جائزة السعودية الكبرى على حلبة
          كورنيش جدة لها قسمها الخاص كأي جولة أخرى، لا كمحور للموقع.
        </p>

        <h2>لماذا هذا الموقع</h2>
        <p>
          المتابع العربي للفورمولا 1 مضطر غالباً للقراءة بالإنجليزية أو الاكتفاء بترجمات
          متأخرة وغير دقيقة. نحاول سدّ هذه الفجوة بمحتوى عربي سريع، مكتوب بمصطلحات صحيحة،
          مع تدقيق حقيقي قبل النشر.
        </p>

        <h2>كيف نعمل</h2>
        <p>
          نرصد الحدث من عدة مصادر متخصصة، ونعيد تحريره بصياغة عربية أصلية، ثم يمرّ بمرحلة
          تدقيق تفحص كل ادعاء واقعي فيه قبل أن يُنشر. التفاصيل الكاملة في{' '}
          <Link href="/editorial-policy">السياسة التحريرية</Link>.
        </p>

        <h2>إشعار</h2>
        <p>
          هذا الموقع غير تابع لـ Formula 1 أو Formula One World Championship Limited أو الاتحاد
          الدولي للسيارات (FIA) أو أي فريق مشارك. جميع العلامات التجارية والأسماء المذكورة ملك
          أصحابها.
        </p>
      </div>
    </div>
  );
}
