import { PageLoading } from '@/components/site/PageLoading';

/** مسيرة السائق تُجلب من عدة صفحات نتائج — الانتظار هنا محسوس فعلاً. */
export default function Loading() {
  return <PageLoading label="جارٍ تحميل مسيرة السائق" />;
}
