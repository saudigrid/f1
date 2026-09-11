import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-4 text-center">
      <div>
        <p className="font-display text-6xl font-bold text-red">404</p>
        <h1 className="mt-4 text-2xl font-bold">خرجنا عن المسار</h1>
        <p className="mt-3 text-muted">الصفحة التي تبحث عنها غير موجودة أو تغيّر رابطها.</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-red px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-hover"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
