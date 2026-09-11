import { TyreSpinner } from './TyreSpinner';

/**
 * شاشة الانتظار بين الصفحات — كفر بيريللي يدور.
 *
 * تُستعمل عبر ملفات `loading.tsx` في مسارات Next: يعرضها الإطار تلقائياً
 * ريثما يُصيَّر الخادم الصفحة، وتختفي وحدها عند وصولها.
 *
 * الارتفاع ثابت (`min-h-[60vh]`) عمداً: لو ترك الحجم للمحتوى لقفزت الصفحة
 * عند التبديل، وهو أسوأ ما يمكن أن يفعله مؤشّر تحميل.
 */
export function PageLoading({ label = 'جارٍ التحميل' }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="flex flex-col items-center gap-4">
        <TyreSpinner size={56} label={label} />
        <p className="text-sm text-subtle">{label}</p>
      </div>
    </div>
  );
}
