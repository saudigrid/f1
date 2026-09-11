import type { Metadata } from 'next';

import { PageHero } from '@/components/hero/PageHero';
import { Leaderboard, type LeaderboardRow } from '@/components/records/Leaderboard';
import { RecordHighlight } from '@/components/records/RecordHighlight';
import { SectionHeading } from '@/components/site/SectionHeading';
import { driverRecord, formatAge, recordsSummary } from '@/lib/data/driver-records';
import { raceNameAr } from '@/lib/data/race-articles';

/**
 * الأرقام القياسية.
 *
 * ⚠️ لا نداء شبكة هنا: كل شيء من `driver-records.json`، مبنيٍّ من نفس الزحف
 * الذي يبني تاريخ الفرق — سباق سباق منذ 1950، فلا حاجة لسؤال Jolpica مرّتين
 * عن الشيء نفسه.
 */
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'الأرقام القياسية',
  description:
    'أكثر السائقين انتصاراً ومنصّات ونقاطاً في تاريخ الفورمولا 1، وأطول سلسلة انتصارات متتالية، وأصغر وأكبر فائز وبطل عالم.',
  alternates: { canonical: '/records' },
};

/** يحوّل حاملي رقم قياسي إلى صفوف جاهزة للوحة صدارة. */
function toRows(holders: { driverId: string; value: number }[]): LeaderboardRow[] {
  return holders.map((holder) => ({
    driverId: holder.driverId,
    nameEn: driverRecord(holder.driverId)?.nameEn ?? holder.driverId,
    value: holder.value,
  }));
}

function toSeasonRows(
  holders: { driverId: string; value: number; season: number }[],
): LeaderboardRow[] {
  return holders.map((holder) => ({
    driverId: holder.driverId,
    nameEn: driverRecord(holder.driverId)?.nameEn ?? holder.driverId,
    value: holder.value,
    sub: `موسم ${holder.season}`,
  }));
}

export default function RecordsPage() {
  const records = recordsSummary();

  const streakRows: LeaderboardRow[] = records.longestWinStreak.map((holder) => ({
    driverId: holder.driverId,
    nameEn: driverRecord(holder.driverId)?.nameEn ?? holder.driverId,
    value: holder.value,
    sub: holder.from && holder.to ? `${holder.from.season}–${holder.to.season}` : undefined,
  }));

  return (
    <>
      <PageHero
        scene="grid"
        compact
        eyebrow={
          <>
            <span className="size-1.5 rounded-full bg-red" />
            منذ 1950
          </>
        }
        title="الأرقام القياسية"
        description="أكثر من فاز، وأصغر من فاز، وأطول سلسلة انتصارات — كل رقم هنا محسوب من نتيجة كل سباق أُقيم في تاريخ هذه الرياضة."
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* ── أحداث مفردة — أصغر/أكبر، أطول سلسلة ─── */}
        <section className="mb-14">
          <SectionHeading title="لحظات قياسية" description="حدث واحد، لا يتكرّر" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {records.youngestWinner && (
              <RecordHighlight
                label="أصغر فائز بسباق"
                driverId={records.youngestWinner.driverId}
                nameEn={driverRecord(records.youngestWinner.driverId)?.nameEn ?? ''}
                value={formatAge(records.youngestWinner.ageDays)}
                context={raceNameAr(records.youngestWinner)}
              />
            )}

            {records.oldestWinner && (
              <RecordHighlight
                label="أكبر فائز بسباق"
                driverId={records.oldestWinner.driverId}
                nameEn={driverRecord(records.oldestWinner.driverId)?.nameEn ?? ''}
                value={formatAge(records.oldestWinner.ageDays)}
                context={raceNameAr(records.oldestWinner)}
              />
            )}

            {records.youngestChampion && (
              <RecordHighlight
                label="أصغر بطل عالم"
                driverId={records.youngestChampion.driverId}
                nameEn={driverRecord(records.youngestChampion.driverId)?.nameEn ?? ''}
                value={formatAge(records.youngestChampion.ageDays)}
                context={`موسم ${records.youngestChampion.season}`}
              />
            )}

            {records.oldestChampion && (
              <RecordHighlight
                label="أكبر بطل عالم"
                driverId={records.oldestChampion.driverId}
                nameEn={driverRecord(records.oldestChampion.driverId)?.nameEn ?? ''}
                value={formatAge(records.oldestChampion.ageDays)}
                context={`موسم ${records.oldestChampion.season}`}
              />
            )}
          </div>
        </section>

        {/* ── الأرقام التراكمية ─────────────────────── */}
        <section className="mb-14">
          <SectionHeading title="الأرقام القياسية" description="المسيرة كاملة، منذ أول سباق دخله كل سائق" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Leaderboard title="الأكثر انتصاراً" unit="انتصاراً" rows={toRows(records.mostWins)} />
            <Leaderboard title="الأكثر صعوداً للمنصّة" unit="منصّة" rows={toRows(records.mostPodiums)} />
            <Leaderboard title="الأكثر جمعاً للنقاط" unit="نقطة" rows={toRows(records.mostPoints)} decimals={0} />
            <Leaderboard title="الأكثر انطلاقاً من المركز الأول" unit="مرّة" rows={toRows(records.mostGridFirst)} />
            <Leaderboard title="الأكثر مشاركة" unit="سباقاً" rows={toRows(records.mostEntries)} />
            <Leaderboard title="الأكثر تتويجاً بالبطولة" unit="لقباً" rows={toRows(records.mostTitles)} />
          </div>
        </section>

        {/* ── سلسلة الانتصارات ──────────────────────── */}
        <section className="mb-14">
          <SectionHeading
            title="أطول سلسلة انتصارات متتالية"
            description="عبر أي فريق قاد له، بلا انقطاع سباق واحد"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Leaderboard title="السلسلة الأطول" unit="سباقاً متتالياً" rows={streakRows} />
          </div>
        </section>

        {/* ── أرقام الموسم الواحد ───────────────────── */}
        <section>
          <SectionHeading title="في موسم واحد" description="أفضل ما حقّقه سائق في اثني عشر شهراً" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Leaderboard
              title="الأكثر انتصاراً في موسم"
              unit="انتصاراً"
              rows={toSeasonRows(records.mostWinsSeason)}
            />
            <Leaderboard
              title="الأكثر نقاطاً في موسم"
              unit="نقطة"
              rows={toSeasonRows(records.mostPointsSeason)}
              decimals={0}
            />
          </div>
        </section>

        <p className="mt-10 text-[0.68rem] leading-relaxed text-subtle">
          «الانطلاق من المركز الأول» مبنيّ على مركز الانطلاق الفعلي في النتائج الرسمية، وقد يختلف عن
          نتيجة التأهّل الأصلية بعد عقوبات الشبكة — فهو ليس مرادفاً دقيقاً لـ«pole position» في كل
          موسم.
        </p>
      </div>
    </>
  );
}
