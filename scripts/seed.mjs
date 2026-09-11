/**
 * توليد بيانات المعاينة في src/data.
 *
 * ⚠️ كل ما ينتجه هذا السكربت بيانات تجريبية للتصميم والاختبار فقط — أرقام
 * الترتيب والنتائج والأخبار ليست معلومات حقيقية ولا يجوز نشرها كما هي.
 * البيانات الحقيقية تأتي لاحقاً من خط الأتمتة ومن مصدر بيانات السباقات.
 *
 * التواريخ تُحسب نسبةً إلى وقت التشغيل حتى يبقى العرض حياً في أي وقت.
 *
 * التشغيل:  node scripts/seed.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "src", "data");
mkdirSync(OUT, { recursive: true });

const now = Date.now();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (offsetMs) => new Date(now + offsetMs).toISOString();

const write = (file, value) => {
  writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + "\n", "utf8");
  console.log(`✓ ${file}`);
};

/* ───────────────────────── الفرق ───────────────────────── */

const teams = [
  { id: "mclaren", slug: "mclaren", name: "مكلارين", nameEn: "McLaren", base: "ووكينغ، بريطانيا", powerUnit: "مرسيدس", color: "#ff8000" },
  { id: "ferrari", slug: "ferrari", name: "فيراري", nameEn: "Ferrari", base: "مارانيلو، إيطاليا", powerUnit: "فيراري", color: "#e8002d" },
  { id: "red-bull", slug: "red-bull", name: "ريد بُل", nameEn: "Red Bull Racing", base: "ميلتون كينز، بريطانيا", powerUnit: "ريد بُل فورد", color: "#3671c6" },
  { id: "mercedes", slug: "mercedes", name: "مرسيدس", nameEn: "Mercedes", base: "براكلي، بريطانيا", powerUnit: "مرسيدس", color: "#27f4d2" },
  { id: "aston-martin", slug: "aston-martin", name: "أستون مارتن", nameEn: "Aston Martin", base: "سيلفرستون، بريطانيا", powerUnit: "هوندا", color: "#229971" },
  { id: "alpine", slug: "alpine", name: "ألبين", nameEn: "Alpine", base: "إنستون، بريطانيا", powerUnit: "مرسيدس", color: "#00a1e8" },
  { id: "williams", slug: "williams", name: "ويليامز", nameEn: "Williams", base: "غروف، بريطانيا", powerUnit: "مرسيدس", color: "#1868db" },
  { id: "racing-bulls", slug: "racing-bulls", name: "ريسينغ بُلز", nameEn: "Racing Bulls", base: "فاينزا، إيطاليا", powerUnit: "ريد بُل فورد", color: "#6692ff" },
  { id: "audi", slug: "audi", name: "أودي", nameEn: "Audi", base: "هينفيل، سويسرا", powerUnit: "أودي", color: "#00e701" },
  { id: "haas", slug: "haas", name: "هاس", nameEn: "Haas", base: "كانابوليس، الولايات المتحدة", powerUnit: "فيراري", color: "#b6babd" },
  { id: "cadillac", slug: "cadillac", name: "كاديلاك", nameEn: "Cadillac", base: "سيلفرستون، بريطانيا", powerUnit: "فيراري", color: "#c8b273" },
];

/* ──────────────────────── السائقون ──────────────────────── */

const drivers = [
  { id: "d-norris", slug: "lando-norris", name: "لاندو نوريس", nameEn: "Lando Norris", number: 4, code: "NOR", nationality: "بريطاني", countryCode: "GB", teamId: "mclaren" },
  { id: "d-piastri", slug: "oscar-piastri", name: "أوسكار بياستري", nameEn: "Oscar Piastri", number: 81, code: "PIA", nationality: "أسترالي", countryCode: "AU", teamId: "mclaren" },
  { id: "d-leclerc", slug: "charles-leclerc", name: "شارل لوكلير", nameEn: "Charles Leclerc", number: 16, code: "LEC", nationality: "مونيغاسكي", countryCode: "MC", teamId: "ferrari" },
  { id: "d-hamilton", slug: "lewis-hamilton", name: "لويس هاميلتون", nameEn: "Lewis Hamilton", number: 44, code: "HAM", nationality: "بريطاني", countryCode: "GB", teamId: "ferrari" },
  { id: "d-verstappen", slug: "max-verstappen", name: "ماكس فيرستابن", nameEn: "Max Verstappen", number: 1, code: "VER", nationality: "هولندي", countryCode: "NL", teamId: "red-bull" },
  { id: "d-tsunoda", slug: "yuki-tsunoda", name: "يوكي تسونودا", nameEn: "Yuki Tsunoda", number: 22, code: "TSU", nationality: "ياباني", countryCode: "JP", teamId: "red-bull" },
  { id: "d-russell", slug: "george-russell", name: "جورج راسل", nameEn: "George Russell", number: 63, code: "RUS", nationality: "بريطاني", countryCode: "GB", teamId: "mercedes" },
  { id: "d-antonelli", slug: "kimi-antonelli", name: "كيمي أنتونيلي", nameEn: "Kimi Antonelli", number: 12, code: "ANT", nationality: "إيطالي", countryCode: "IT", teamId: "mercedes" },
  { id: "d-alonso", slug: "fernando-alonso", name: "فرناندو ألونسو", nameEn: "Fernando Alonso", number: 14, code: "ALO", nationality: "إسباني", countryCode: "ES", teamId: "aston-martin" },
  { id: "d-stroll", slug: "lance-stroll", name: "لانس سترول", nameEn: "Lance Stroll", number: 18, code: "STR", nationality: "كندي", countryCode: "CA", teamId: "aston-martin" },
  { id: "d-gasly", slug: "pierre-gasly", name: "بيير غاسلي", nameEn: "Pierre Gasly", number: 10, code: "GAS", nationality: "فرنسي", countryCode: "FR", teamId: "alpine" },
  { id: "d-colapinto", slug: "franco-colapinto", name: "فرانكو كولابينتو", nameEn: "Franco Colapinto", number: 43, code: "COL", nationality: "أرجنتيني", countryCode: "AR", teamId: "alpine" },
  { id: "d-albon", slug: "alex-albon", name: "أليكس ألبون", nameEn: "Alex Albon", number: 23, code: "ALB", nationality: "تايلندي", countryCode: "TH", teamId: "williams" },
  { id: "d-sainz", slug: "carlos-sainz", name: "كارلوس ساينز", nameEn: "Carlos Sainz", number: 55, code: "SAI", nationality: "إسباني", countryCode: "ES", teamId: "williams" },
  { id: "d-hadjar", slug: "isack-hadjar", name: "إيزاك حجار", nameEn: "Isack Hadjar", number: 6, code: "HAD", nationality: "فرنسي", countryCode: "FR", teamId: "racing-bulls" },
  { id: "d-lawson", slug: "liam-lawson", name: "ليام لوسون", nameEn: "Liam Lawson", number: 30, code: "LAW", nationality: "نيوزيلندي", countryCode: "NZ", teamId: "racing-bulls" },
  { id: "d-hulkenberg", slug: "nico-hulkenberg", name: "نيكو هولكنبرغ", nameEn: "Nico Hülkenberg", number: 27, code: "HUL", nationality: "ألماني", countryCode: "DE", teamId: "audi" },
  { id: "d-bortoleto", slug: "gabriel-bortoleto", name: "غابرييل بورتوليتو", nameEn: "Gabriel Bortoleto", number: 5, code: "BOR", nationality: "برازيلي", countryCode: "BR", teamId: "audi" },
  { id: "d-ocon", slug: "esteban-ocon", name: "إستيبان أوكون", nameEn: "Esteban Ocon", number: 31, code: "OCO", nationality: "فرنسي", countryCode: "FR", teamId: "haas" },
  { id: "d-bearman", slug: "oliver-bearman", name: "أوليفر بيرمان", nameEn: "Oliver Bearman", number: 87, code: "BEA", nationality: "بريطاني", countryCode: "GB", teamId: "haas" },
  { id: "d-perez", slug: "sergio-perez", name: "سيرجيو بيريز", nameEn: "Sergio Pérez", number: 11, code: "PER", nationality: "مكسيكي", countryCode: "MX", teamId: "cadillac" },
  { id: "d-bottas", slug: "valtteri-bottas", name: "فالتيري بوتاس", nameEn: "Valtteri Bottas", number: 77, code: "BOT", nationality: "فنلندي", countryCode: "FI", teamId: "cadillac" },
];

/* ───────────────────────── التقويم ───────────────────────── */

/** حلبات الموسم بالترتيب. الجولة القادمة تبدأ بعد 9 أيام من الآن. */
const calendar = [
  ["البحرين", "حلبة البحرين الدولية", "البحرين", "BH", false],
  ["السعودية", "حلبة كورنيش جدة", "السعودية", "SA", false],
  ["أستراليا", "حلبة ألبرت بارك", "أستراليا", "AU", false],
  ["اليابان", "حلبة سوزوكا", "اليابان", "JP", true],
  ["الصين", "حلبة شنغهاي الدولية", "الصين", "CN", true],
  ["ميامي", "حلبة ميامي الدولية", "الولايات المتحدة", "US", true],
  ["كندا", "حلبة جيل فيلنوف", "كندا", "CA", false],
  ["موناكو", "حلبة موناكو", "موناكو", "MC", false],
  ["إسبانيا", "حلبة كتالونيا", "إسبانيا", "ES", false],
  ["النمسا", "حلبة ريد بُل رينغ", "النمسا", "AT", false],
  ["بريطانيا", "حلبة سيلفرستون", "بريطانيا", "GB", false],
  ["بلجيكا", "حلبة سبا فرانكورشان", "بلجيكا", "BE", true],
  ["المجر", "حلبة هنغارورينغ", "المجر", "HU", false],
  ["هولندا", "حلبة زاندفورت", "هولندا", "NL", false],
  ["إيطاليا", "حلبة مونزا", "إيطاليا", "IT", false],
  ["أذربيجان", "حلبة باكو الحضرية", "أذربيجان", "AZ", false],
  ["سنغافورة", "حلبة مارينا باي", "سنغافورة", "SG", false],
  ["أوستن", "حلبة الأمريكتين", "الولايات المتحدة", "US", true],
  ["المكسيك", "حلبة إرمانوس رودريغيز", "المكسيك", "MX", false],
  ["البرازيل", "حلبة إنترلاغوس", "البرازيل", "BR", true],
  ["لاس فيغاس", "حلبة لاس فيغاس", "الولايات المتحدة", "US", false],
  ["قطر", "حلبة لوسيل الدولية", "قطر", "QA", true],
  ["أبوظبي", "حلبة مرسى ياس", "الإمارات", "AE", false],
];

/** الجولة 15 هي القادمة — أي أن 14 جولة انتهت. */
const NEXT_ROUND_INDEX = 14;
const DAYS_TO_NEXT = 9;

const slugify = (s) =>
  ({
    البحرين: "bahrain", السعودية: "saudi-arabia", أستراليا: "australia", اليابان: "japan",
    الصين: "china", ميامي: "miami", كندا: "canada", موناكو: "monaco", إسبانيا: "spain",
    النمسا: "austria", بريطانيا: "britain", بلجيكا: "belgium", المجر: "hungary",
    هولندا: "netherlands", إيطاليا: "italy", أذربيجان: "azerbaijan", سنغافورة: "singapore",
    أوستن: "united-states", المكسيك: "mexico", البرازيل: "brazil",
    "لاس فيغاس": "las-vegas", قطر: "qatar", أبوظبي: "abu-dhabi",
  })[s] ?? "race";

/** أفضل 10 في سباق افتراضي — يُستخدم لتعبئة نتائج الجولات المنتهية. */
const podiumRotation = [
  ["d-norris", "d-verstappen", "d-piastri", "d-leclerc", "d-russell", "d-hamilton", "d-antonelli", "d-albon", "d-alonso", "d-sainz"],
  ["d-piastri", "d-norris", "d-leclerc", "d-verstappen", "d-hamilton", "d-russell", "d-sainz", "d-antonelli", "d-gasly", "d-alonso"],
  ["d-verstappen", "d-norris", "d-russell", "d-piastri", "d-leclerc", "d-antonelli", "d-hamilton", "d-hadjar", "d-albon", "d-ocon"],
];
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const teamOf = (driverId) => drivers.find((d) => d.id === driverId).teamId;

const races = calendar.map(([name, circuit, country, cc, isSprint], i) => {
  const round = i + 1;
  const offsetDays = (round - (NEXT_ROUND_INDEX + 1)) * 14 + DAYS_TO_NEXT;
  const startsAt = iso(offsetDays * DAY);
  const completed = round <= NEXT_ROUND_INDEX;

  return {
    id: `r-${round}`,
    slug: `${slugify(name)}-gp`,
    round,
    season: 2026,
    name: `جائزة ${name} الكبرى`,
    circuit,
    country,
    countryCode: cc,
    startsAt,
    status: completed ? "completed" : "upcoming",
    isSprint,
    ...(completed
      ? {
          results: podiumRotation[round % 3].map((driverId, pos) => ({
            position: pos + 1,
            driverId,
            teamId: teamOf(driverId),
            points: POINTS[pos],
            time: pos === 0 ? "1:32:14.771" : `+${(pos * 3.4 + 1.2).toFixed(3)}`,
          })),
        }
      : {}),
  };
});

/* ───────────────────────── الترتيب ───────────────────────── */

// يُجمع فعلياً من نتائج الجولات المنتهية بدل أرقام مكتوبة يدوياً
const driverPoints = new Map(drivers.map((d) => [d.id, { points: 0, wins: 0 }]));
for (const race of races) {
  for (const row of race.results ?? []) {
    const rec = driverPoints.get(row.driverId);
    rec.points += row.points;
    if (row.position === 1) rec.wins += 1;
  }
}

const driverStandings = [...driverPoints.entries()]
  .map(([entityId, v]) => ({ entityId, ...v }))
  .sort((a, b) => b.points - a.points || b.wins - a.wins)
  .map((row, i) => ({ position: i + 1, points: row.points, wins: row.wins, entityId: row.entityId }));

const teamPoints = new Map(teams.map((t) => [t.id, { points: 0, wins: 0 }]));
for (const row of driverStandings) {
  const rec = teamPoints.get(teamOf(row.entityId));
  rec.points += row.points;
  rec.wins += row.wins;
}

const constructorStandings = [...teamPoints.entries()]
  .map(([entityId, v]) => ({ entityId, ...v }))
  .sort((a, b) => b.points - a.points)
  .map((row, i) => ({ position: i + 1, points: row.points, wins: row.wins, entityId: row.entityId }));

/* ───────────────────────── الأخبار ───────────────────────── */

const p = (...parts) => parts.join("\n\n");

const articleSeeds = [
  {
    slug: "mclaren-upgrade-package-monza",
    category: "tech",
    title: "مكلارين تختبر حزمة تطوير جديدة في مونزا استعداداً للجولات الأخيرة",
    excerpt: "الفريق البرتقالي يجرب أرضية معدّلة وجناحاً خلفياً منخفض الضغط في محاولة لتثبيت أفضليته.",
    tags: ["مكلارين", "تطويرات", "مونزا"],
    hours: 3,
    featured: true,
    minutes: 4,
    body: p(
      "وصلت مكلارين إلى حلبة مونزا بحزمة تطويرات تركّز على الأرضية والجناح الخلفي، في ما يبدو أنه آخر تحديث كبير للسيارة هذا الموسم قبل تحويل الموارد بالكامل إلى مشروع العام المقبل.",
      "التعديل الأبرز يقع في المقطع الأمامي من قنوات فنتوري، حيث أعاد المهندسون تشكيل الحواف بهدف تثبيت مركز الضغط عند تغير ارتفاع السيارة. المشكلة التي كانت تلاحق السيارة في المنعطفات السريعة تتلخص في تذبذب الضغط الهوائي عند انضغاط التعليق، وهو ما كان يجبر السائقين على ترك هامش أمان يكلّفهم أجزاءً من الثانية.",
      "## جناح خاص بالسرعات العالية",
      "إلى جانب الأرضية، يظهر جناح خلفي بزاوية هجوم أقل من المعتاد، مصمّم خصيصاً لمونزا حيث تُقضى نسبة كبيرة من اللفة عند أقصى سرعة. هذا النوع من الأجنحة يُستخدم عادة في حلبة واحدة أو اثنتين في الموسم، ما يجعله استثماراً مكلفاً نسبةً إلى عدد مرات استخدامه.",
      "يبقى السؤال المفتوح ما إذا كانت هذه الحزمة ستنتقل إلى بقية جولات الموسم أم أنها مخصصة للحلبات منخفضة الضغط الهوائي فقط. الفريق لم يوضّح ذلك حتى الآن.",
    ),
  },
  {
    slug: "fia-flexible-wing-tests-tightened",
    category: "regulations",
    title: "الاتحاد الدولي يشدّد اختبارات انحناء الأجنحة اعتباراً من الجولة القادمة",
    excerpt: "توجيه فني جديد يرفع أحمال الاختبار على الجناح الأمامي بعد شكاوى من عدة فرق.",
    tags: ["FIA", "لوائح", "أجنحة مرنة"],
    hours: 9,
    minutes: 3,
    body: p(
      "أصدر الاتحاد الدولي للسيارات توجيهاً فنياً يرفع الأحمال المطبّقة في اختبارات انحناء الجناح الأمامي، مع تقليص الحد المسموح به للانحراف تحت الحمل.",
      "الخلفية معروفة: الأجنحة التي تنحني قليلاً عند السرعات العالية تقلل المقاومة الهوائية على المستقيمات ثم تستعيد شكلها في المنعطفات، فتجمع بين ميزتين متعارضتين. التصميمات الحالية تجتاز الاختبارات الثابتة بينما تتصرف بشكل مختلف على الحلبة.",
      "الفرق التي بنت فلسفتها الهوائية حول هذه الخاصية ستضطر إلى تقوية الهيكل، وهو ما يعني وزناً إضافياً وربما فقداناً في الأداء يصعب تعويضه في ما تبقى من الموسم.",
      "التوجيه يدخل حيّز التنفيذ من الجولة القادمة مباشرة، دون فترة انتقالية.",
    ),
  },
  {
    slug: "jeddah-corniche-layout-review",
    category: "saudi",
    title: "مراجعة تخطيط حلبة كورنيش جدة: تعديلات مقترحة على المنعطفات السريعة",
    excerpt: "دراسة لتحسين خطوط الرؤية في القطاع الثاني، أسرع قطاع حضري في البطولة.",
    tags: ["جدة", "السعودية", "حلبات"],
    hours: 20,
    minutes: 5,
    body: p(
      "تخضع حلبة كورنيش جدة لمراجعة هندسية تركّز على القطاع الثاني، وتحديداً سلسلة المنعطفات السريعة التي تُقطع عند سرعات تتجاوز 300 كم/س بين جدران خرسانية متقاربة.",
      "جدة هي أسرع حلبة حضرية في البطولة، وهذه الصفة نفسها هي مصدر التحدي: الجدران القريبة تعني خطوط رؤية قصيرة، فالسائق قد لا يرى سيارة متوقفة أو حطاماً على المسار إلا في اللحظة الأخيرة.",
      "## ما الذي تُدرس تعديله",
      "المقترحات المتداولة تتضمن إزاحة بعض الجدران للخلف عند نقاط محددة، وإعادة تشكيل حواف المنعطفات لتوسيع مجال الرؤية دون المساس بطابع الحلبة السريع الذي يميّزها.",
      "أي تعديل من هذا النوع يحتاج موافقة الاتحاد الدولي ووقتاً كافياً للتنفيذ بين الموسمين، ولم يصدر حتى الآن قرار نهائي بشأن ما سيُطبَّق فعلاً.",
    ),
  },
  {
    slug: "power-unit-reliability-2026-era",
    category: "tech",
    title: "موثوقية وحدات القدرة الجديدة: أين تقف الفرق بعد نصف موسم",
    excerpt: "قراءة في أعطال الموسم حتى الآن وما تكشفه عن فلسفات التبريد المختلفة.",
    tags: ["وحدات القدرة", "موثوقية", "تحليل"],
    hours: 30,
    minutes: 6,
    body: p(
      "بعد أكثر من نصف الموسم على اللوائح الفنية الجديدة، بدأت صورة أوضح تتشكّل حول موثوقية وحدات القدرة وأي المصنّعين تعامل مع التحدي بشكل أفضل.",
      "التغيير الجوهري في هذه الحقبة هو الزيادة الكبيرة في نصيب الطاقة الكهربائية من إجمالي القدرة، وما يترتب عليها من أحمال حرارية أعلى على البطارية ووحدة التحكم. هذا نقل عنق الزجاجة من المحرك الاحتراقي إلى منظومة التبريد.",
      "## فلسفتان متقابلتان",
      "بعض الفرق اختارت فتحات تبريد أوسع تضمن هامش أمان حرارياً على حساب المقاومة الهوائية، وأخرى راهنت على تغليف أضيق يمنحها أفضلية على المستقيمات لكنه يترك هامشاً ضيقاً في السباقات الحارة.",
      "الجولات المتبقية في مناخات مختلفة ستكون الاختبار الحقيقي: الرهان الضيق يبدو ذكياً حتى تأتي حلبة حارة ورطبة تكشف حدوده.",
    ),
  },
  {
    slug: "tyre-compound-shift-final-races",
    category: "news",
    title: "مورّد الإطارات يعتمد خلطات أطرى في الجولات المتبقية",
    excerpt: "الهدف دفع الفرق نحو استراتيجيات توقفين بدل التوقف الواحد الذي ساد أغلب الموسم.",
    tags: ["إطارات", "استراتيجية"],
    hours: 44,
    minutes: 3,
    body: p(
      "أعلن مورّد الإطارات اعتماد خلطات أطرى بدرجة واحدة في عدد من الجولات المتبقية، في محاولة لكسر نمط التوقف الواحد الذي هيمن على أغلب سباقات الموسم.",
      "التوقف الواحد يقلّل فرص تبادل المراكز ويجعل ترتيب خط الانطلاق حاسماً أكثر مما ينبغي. الخلطة الأطرى تتدهور أسرع، ما يفتح الباب أمام اختلاف الاستراتيجيات بين الفرق.",
      "لهذا التغيير وجه آخر: الفرق التي تعاني أصلاً من استهلاك الإطارات الخلفية قد تجد نفسها في وضع أصعب، بينما تستفيد الفرق اللطيفة على إطاراتها.",
    ),
  },
  {
    slug: "sprint-format-review-talks",
    category: "regulations",
    title: "نقاشات حول تعديل صيغة سباق السبرنت للموسم المقبل",
    excerpt: "مقترحات لفصل تأهيلي السبرنت عن السباق الرئيسي بشكل أوضح.",
    tags: ["سبرنت", "لوائح"],
    hours: 58,
    minutes: 3,
    body: p(
      "تدور نقاشات بين الفرق والجهة المنظمة حول تعديل صيغة نهاية الأسبوع في جولات السبرنت، بعد ملاحظات على التداخل بين جلسات السبرنت والسباق الرئيسي.",
      "الشكوى الأساسية أن حصة التجارب الحرة الواحدة لا تكفي لضبط السيارة، ما يدفع الفرق إلى تفضيل الإعدادات الآمنة ويقلّل التنوع بين السيارات على الحلبة.",
      "المقترحات المتداولة تشمل إعادة توزيع الجلسات وتغيير نظام النقاط. لا شيء نهائي حتى الآن، وأي تعديل يحتاج موافقة أغلبية الفرق.",
    ),
  },
  {
    slug: "rookie-fp1-sessions-quota",
    category: "news",
    title: "حصة السائقين الناشئين في التجارب الحرة تُستكمل في الجولات الأخيرة",
    excerpt: "عدة فرق لم تستوفِ بعد العدد المطلوب من جلسات الناشئين هذا الموسم.",
    tags: ["ناشئون", "تجارب حرة"],
    hours: 70,
    minutes: 2,
    body: p(
      "تواجه عدة فرق ضغطاً لاستكمال حصتها الإلزامية من جلسات التجارب الحرة المخصصة للسائقين الناشئين قبل نهاية الموسم.",
      "القاعدة تلزم كل فريق بإفساح جلسة تجارب حرة أولى لسائق ناشئ في كل سيارة عدداً محدداً من المرات خلال الموسم. تأجيل ذلك إلى الجولات الأخيرة يعني التضحية بوقت إعداد ثمين في سباقات قد تكون حاسمة للترتيب.",
      "الفرق التي حسمت موقعها في جدول الصانعين تملك مرونة أكبر، أما المتصارعة على مراكز متقاربة فأمامها موازنة صعبة.",
    ),
  },
  {
    slug: "brake-cooling-hot-races",
    category: "tech",
    title: "تبريد المكابح: التفصيل الذي يحسم السباقات الحارة",
    excerpt: "كيف تتحول قنوات هوائية بحجم الكف إلى فارق ثوانٍ على مدى السباق.",
    tags: ["مكابح", "تحليل تقني"],
    hours: 96,
    minutes: 5,
    body: p(
      "قنوات تبريد المكابح من أكثر المكوّنات التي تُعدَّل بين حلبة وأخرى، وأقلها ظهوراً في التغطية الإعلامية رغم أثرها المباشر على السباق.",
      "الوظيفة مزدوجة: تصريف حرارة الأقراص، وإدارة انتقال الحرارة إلى جوف الإطار. الحرارة المنقولة إلى الإطار تؤثر على ضغطه وسلوكه، وهذا ما يجعل قناة التبريد أداة ضبط لأداء الإطار لا لحماية المكابح فقط.",
      "## لماذا تختلف بين الحلبات",
      "حلبة كثيرة الكبح مثل مونتريال تحتاج تصريفاً أكبر، بينما حلبة سريعة قليلة الكبح تسمح بقنوات أضيق تقلل المقاومة الهوائية. الخطأ في التقدير يظهر متأخراً — في آخر ثلث السباق حين يبدأ الأداء بالتدهور.",
    ),
  },
  {
    slug: "midfield-battle-constructors",
    category: "news",
    title: "معركة الوسط تشتد: أربعة فرق تفصلها نقاط قليلة",
    excerpt: "كل مركز في جدول الصانعين يعني فارقاً مالياً كبيراً في نهاية الموسم.",
    tags: ["ترتيب", "صانعون"],
    hours: 120,
    minutes: 3,
    body: p(
      "يشهد وسط جدول الصانعين تقارباً شديداً، مع فروق نقاط ضئيلة بين عدة فرق في الجولات الأخيرة من الموسم.",
      "الأمر ليس مسألة كبرياء فقط. توزيع العائدات مرتبط بالمركز النهائي في جدول الصانعين، والفارق بين مركزين متجاورين يُقاس بملايين الدولارات تُترجم مباشرة إلى ميزانية تطوير العام المقبل.",
      "هذا التقارب يدفع الفرق إلى مخاطرة استراتيجية أكبر: توقفات مبكرة، رهانات على سيارة الأمان، وقرارات ما كانت لتُتخذ لو كان الفارق مريحاً.",
    ),
  },
  {
    slug: "cost-cap-2026-development-shift",
    category: "regulations",
    title: "سقف الإنفاق يعيد رسم توقيت التخلي عن سيارة الموسم الحالي",
    excerpt: "الفرق تحسم مبكراً متى تتوقف عن تطوير السيارة الحالية لصالح المشروع القادم.",
    tags: ["سقف الإنفاق", "تطوير"],
    hours: 150,
    minutes: 4,
    body: p(
      "أصبح قرار التوقف عن تطوير سيارة الموسم الحالي من أصعب القرارات التي تواجه القيادة الفنية، بعد أن جعل سقف الإنفاق كل ساعة نفق هوائي وكل قطعة مصنّعة خياراً على حساب خيار آخر.",
      "الفرق المتصارعة على اللقب تتأخر في التحول لأن كل جزء من العُشر قد يحسم البطولة، بينما تحوّلت فرق الوسط مبكراً إلى مشروع العام المقبل.",
      "التحدي أن نتيجة هذا القرار لا تظهر إلا بعد أشهر، حين يكون تصحيح المسار مستحيلاً.",
    ),
  },
  {
    slug: "safety-car-strategy-analysis",
    category: "tech",
    title: "سيارة الأمان: كيف تحسب الفرق قرار التوقف في ثوانٍ",
    excerpt: "نظرة على النماذج الحسابية التي تعمل على جسر القيادة لحظة ظهور العلم الأصفر.",
    tags: ["استراتيجية", "سيارة الأمان"],
    hours: 180,
    minutes: 5,
    body: p(
      "لحظة إعلان سيارة الأمان تُختصر أشهر من العمل الحسابي في قرار واحد يُتخذ خلال ثوانٍ: هل ندخل للتوقف الآن أم نُبقي السائق على المسار؟",
      "المكسب معروف: التوقف تحت سيارة الأمان يكلّف زمناً أقل بكثير من التوقف في ظروف السباق العادية، لأن السيارات أمامك تسير بسرعة منخفضة أصلاً. لكن المخاطرة أن تعود إلى المسار خلف قطار من السيارات يصعب تجاوزه.",
      "## ما الذي يحسبه النموذج",
      "النماذج على جسر القيادة تحسب موقع كل سيارة على المسار لحظة الخروج من الحارة، واحتمال دخول المنافسين، وحالة الإطارات المتاحة. النتيجة احتمال لا يقين، والقرار يبقى بشرياً في النهاية.",
    ),
  },
  {
    slug: "driver-market-late-season",
    category: "transfers",
    title: "سوق السائقين: تقارير عن محادثات لم تُحسم بعد",
    excerpt: "عدة مقاعد ما تزال دون تأكيد رسمي مع اقتراب نهاية الموسم.",
    tags: ["انتقالات", "سوق السائقين"],
    hours: 210,
    minutes: 3,
    body: p(
      "بحسب تقارير صحفية لم تؤكدها الفرق رسمياً، تدور محادثات حول عدد من المقاعد التي لم تُحسم بعد للموسم المقبل.",
      "من المهم التوضيح أن هذه المعلومات تبقى في إطار التقارير الصحفية، ولم يصدر عن أي فريق إعلان رسمي بشأنها حتى لحظة نشر هذا الخبر.",
      "تاريخياً، أغلب هذه المحادثات لا تُعلن إلا بعد اكتمالها بالكامل، وكثير مما يُتداول في هذه المرحلة لا يتحقق. نلتزم بعدم تقديم أي منها كأمر مؤكد.",
    ),
  },
];

const heroFor = () => undefined;

const articles = articleSeeds.map((seed, i) => ({
  id: `seed-${i + 1}`,
  slug: seed.slug,
  locale: "ar",
  title: seed.title,
  excerpt: seed.excerpt,
  body: seed.body,
  category: seed.category,
  tags: seed.tags,
  heroImage: heroFor(),
  publishedAt: iso(-seed.hours * HOUR),
  readingMinutes: seed.minutes,
  featured: !!seed.featured,
  status: "published",
  sources: [
    {
      outlet: "بيانات تجريبية",
      url: "https://example.com/seed",
      publishedAt: iso(-seed.hours * HOUR),
      lang: "ar",
    },
  ],
  internal: { ingestId: `seed-${i + 1}` },
}));

/* خبر واحد في طابور المراجعة ليظهر شكل اللوحة قبل تفعيل الوكلاء */
articles.push({
  id: "seed-queued-1",
  slug: "queued-example",
  locale: "ar",
  title: "تقرير غير مؤكد عن تعديل في تشكيلة أحد الفرق",
  excerpt: "خبر تجريبي لعرض شكل طابور المراجعة — لم يتجاوز عتبة النشر التلقائي.",
  body: p(
    "هذا خبر تجريبي موجود لعرض شكل لوحة المراجعة قبل تفعيل وكلاء الذكاء الاصطناعي.",
    "بحسب تقرير لم تؤكده أي جهة رسمية، تدور محادثات حول تعديل محتمل. الخبر لم يتجاوز عتبة النشر التلقائي لأن مصدره واحد ولأنه يقع في تصنيف الانتقالات الذي يمر بمراجعة بشرية دائماً.",
  ),
  category: "transfers",
  tags: ["انتقالات"],
  publishedAt: iso(-2 * HOUR),
  readingMinutes: 2,
  featured: false,
  status: "pending_review",
  sources: [
    { outlet: "بيانات تجريبية", url: "https://example.com/seed", publishedAt: iso(-2 * HOUR), lang: "ar" },
  ],
  internal: {
    ingestId: "seed-queued-1",
    translatorModel: "seed",
    autoPublished: false,
    factCheck: {
      confidence: 58,
      verdict: "partially_verified",
      independentSourceCount: 1,
      checkedAt: iso(-2 * HOUR),
      model: "seed",
      claims: [
        { claim: "تدور محادثات حول تعديل في التشكيلة", status: "unsupported", note: "لم يصدر تأكيد رسمي من الفريق" },
        { claim: "الخبر منسوب إلى تقرير صحفي", status: "supported", note: "النسبة واضحة في المتن" },
      ],
      editorNotes: [
        "مصدر واحد فقط — يحتاج تأكيداً ثانياً مستقلاً قبل النشر.",
        "تأكد من أن صيغة المتن لا تقدّم التقرير كأمر محسوم.",
      ],
    },
  },
});

/* ───────────────────────── الكتابة ───────────────────────── */

write("teams.json", teams);
write("drivers.json", drivers);
write("races.json", races);
write("standings.json", {
  season: 2026,
  updatedAt: iso(-3 * DAY),
  drivers: driverStandings,
  constructors: constructorStandings,
});
write("articles.json", articles);
write("ads.json", []);

console.log("\n⚠️  تذكير: هذه بيانات تجريبية للتصميم فقط، ليست معلومات حقيقية.");
