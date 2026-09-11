/** ترويسة صفحة نصّية: عنوان مع الشريط الأحمر المميّز للموقع. */
export function PageHeader({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="mb-10">
      <h1 className="flex items-center gap-3 text-3xl font-bold sm:text-4xl">
        <span className="h-8 w-1.5 shrink-0 rounded-full bg-red" aria-hidden="true" />
        {title}
      </h1>
      {lead && <p className="mt-4 max-w-2xl leading-relaxed text-muted">{lead}</p>}
    </header>
  );
}
