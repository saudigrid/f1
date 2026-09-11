import Link from 'next/link';

import { Flag } from '@/components/site/Flag';
import { raceArticle } from '@/lib/data/race-articles';
import { formatDate } from '@/lib/format';
import type { RaceSummary } from '@/lib/data/history';

/**
 * صفّ سباق واحد: الجولة والاسم والعلم والتاريخ ومنصّة التتويج وملخّص المقالة.
 *
 * المنصّة تُعرض دائماً حين تتوفّر — هي جوهر ما يبحث عنه القارئ في سباق قديم،
 * وإخفاؤها خلف نقرة إضافية يجعل تصفّح موسم كامل عملاً شاقاً.
 *
 * ## الاسم هو الرابط
 *
 * كان في أسفل الصفّ شريط مستقلّ مكتوب عليه «مقال السباق على ويكيبيديا ↗» —
 * سطر يشغل مساحة ليقول ما يقوله الاسم نفسه. فصار **اسم السباق** هو الرابط،
 * ويحمرّ عند المرور. والمصدر يُنسب تحت الملخّص بكلمة واحدة، لأن النسبة واجبة
 * والضجيج ليس كذلك.
 */
export function RaceRow({ race, upcoming = false }: { race: RaceSummary; upcoming?: boolean }) {
  const article = raceArticle(race.season, race.round);

  /**
   * ⚠️ الأولوية للمقالة العربية. رابط Ergast إنجليزي، وإرسال قارئ عربي إلى
   * نصّ إنجليزي ليس نسبةً بل تحويلاً إلى لغة أخرى.
   */
  const href = article?.url ?? race.wikipediaUrl;

  const title = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="truncate transition-colors hover:text-red"
    >
      {race.name}
    </a>
  ) : (
    <span className="truncate">{race.name}</span>
  );

  return (
    <li
      className={`overflow-hidden rounded-[var(--radius-card)] border bg-surface transition-colors ${
        upcoming ? 'border-red' : 'border-line hover:border-line-strong'
      }`}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="tnum grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-bg font-display text-base font-bold text-muted">
            {race.round}
          </span>

          <div className="min-w-0">
            <h3 className="flex items-center gap-2 truncate font-bold">
              <Flag code={race.countryCode} name={race.country} />
              {title}
            </h3>
            <p className="mt-0.5 truncate text-xs text-subtle">
              <Link href={`/circuits/${race.circuitId}`} className="hover:text-red">
                {race.circuitName}
              </Link>
            </p>
          </div>
        </div>

        <div className="sm:ms-auto sm:shrink-0 sm:text-end">
          <p className="text-sm text-muted">{formatDate(race.date)}</p>
          {upcoming && <p className="mt-0.5 text-xs font-semibold text-red">السباق القادم</p>}
        </div>
      </div>

      {race.podium.length > 0 && (
        <ol className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line bg-bg/40 px-4 py-3 text-sm">
          {race.podium.map((slot) => (
            <li key={slot.position} className="flex items-center gap-2">
              <span
                className={`tnum grid size-5 shrink-0 place-items-center rounded font-display text-[0.7rem] font-bold ${
                  slot.position === 1 ? 'bg-red text-white' : 'bg-surface-2 text-muted'
                }`}
              >
                {slot.position}
              </span>
              <span className="text-muted">{slot.driverName}</span>
              <span className="text-xs text-subtle" dir="ltr">
                {slot.constructor}
              </span>
            </li>
          ))}
        </ol>
      )}

      {article && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-[0.82rem] leading-relaxed text-muted">{article.summary}</p>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-block text-[0.7rem] font-medium text-red transition-opacity hover:opacity-70"
          >
            (المصدر)
          </a>
        </div>
      )}
    </li>
  );
}
