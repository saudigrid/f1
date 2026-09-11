/**
 * اختبار دخان شامل — كل صفحة وكل خاصية.
 *
 *   npm run test:smoke                    # على خادم التطوير
 *   npm run test:smoke -- --base https://…  # على النشر
 *
 * ليس اختبار وحدات: الغرض أن نعرف بسرعة أن **الموقع كله يعمل** — كل مسار
 * يستجيب، وكل صفحة تحمل محتواها المتوقّع فعلاً لا صفحة خطأ بحالة 200.
 *
 * ⚠️ الفحص على **المحتوى** لا على الحالة وحدها. صفحة تعيد 200 وهي فارغة تمرّ
 * من فحص الحالة، وهذا ما يجعل اختبارات الدخان عديمة الفائدة حين تُكتب بكسل.
 */

interface Check {
  path: string;
  name: string;
  /** نصوص يجب أن تظهر في الصفحة. */
  expect?: string[];
  /** نصوص يجب ألّا تظهر. */
  reject?: string[];
  status?: number;
  /**
   * فحص أمني: يكفي **ألّا** تنجح، ولا يهمّ برمز أي رفض.
   *
   * حقن المسار مثلاً يرفضه موجّه Next بـ404 قبل أن يصل معالجنا أصلاً، بينما
   * موسم غير صالح يصله فيردّ 400. كلاهما رفض سليم، وتثبيت رمز بعينه يجعل
   * الاختبار يفشل عند تغيير داخلي لا يمسّ الأمان.
   */
  mustNotSucceed?: boolean;
  contentType?: string;
}

const CHECKS: Check[] = [
  // ── الصفحات الرئيسية ─────────────────────────
  { path: '/', name: 'الرئيسية', expect: ['SAUDI', 'الفورمولا'] },
  { path: '/news', name: 'الأخبار', expect: ['الأخبار'] },
  { path: '/races', name: 'السباقات', expect: ['سباقات موسم', 'الموسم'] },
  { path: '/races?season=1976', name: 'سباقات 1976', expect: ['1976', 'جائزة'] },
  { path: '/calendar', name: 'الروزنامة', expect: ['روزنامة', 'أضفها إلى تقويمي'] },
  { path: '/circuits', name: 'الحلبات', expect: ['الحلبات الحالية', 'الحلبات السابقة'] },
  { path: '/circuits/monza', name: 'حلبة مونزا', expect: ['مونزا', 'الطول', 'عن الحلبة'] },
  { path: '/drivers', name: 'السائقون', expect: ['سائقو الموسم', 'أبطال العالم', 'السائقون السابقون'] },
  { path: '/drivers/senna', name: 'أيرتون سينا', expect: ['سينا', 'بطل العالم', 'ترتيبه في كل سباق'] },
  { path: '/standings', name: 'الترتيب', expect: ['ترتيب'] },
  { path: '/teams', name: 'الفرق', expect: ['الفرق', 'الفرق السابقة'] },
  {
    path: '/teams/former',
    name: 'الفرق السابقة',
    expect: ['الفرق السابقة', 'فريقاً غادروا', 'أبطال الصانعين'],
  },
  {
    path: '/teams/former/team_lotus',
    name: 'فريق لوتس',
    expect: ['لوتس', 'من قاد له', 'ألقاب الصانعين', '(المصدر)'],
    // فريق نشط لا يجوز أن يُفتح من مسار «السابقة»
  },
  { path: '/teams/former/ferrari', name: 'فيراري ليست سابقة', status: 404 },
  {
    path: '/races?season=1976',
    name: 'مقالة سباق عربية',
    expect: ['(المصدر)', 'ar.wikipedia.org'],
    reject: ['مقال السباق على ويكيبيديا'],
  },
  {
    path: '/technical',
    name: 'التحليل الفني',
    expect: ['ما وراء النتيجة', 'أداء السائقين في كل جلسة', 'استراتيجية الإطارات', 'PIT STOP SUMMARY'],
  },
  { path: '/brand/dhl.svg', name: 'شعار DHL', contentType: 'image/svg' },
  {
    path: '/search-index.json',
    name: 'فهرس البحث',
    contentType: 'application/json',
    expect: ['سينا', '"k":"driver"'],
  },
  { path: '/api/telemetry?session=0&driver=0&from=x', name: 'تيليمتري بوسائط خاطئة', mustNotSucceed: true },
  { path: '/eras', name: 'تاريخ الرياضة', expect: ['تاريخ الفورمولا 1', 'التوربو'] },
  {
    path: '/records',
    name: 'الأرقام القياسية',
    expect: ['الأرقام القياسية', 'الأكثر انتصاراً', 'أصغر فائز بسباق'],
  },

  // ── الصفحات الثانوية ─────────────────────────
  { path: '/about', name: 'عن الموقع' },
  { path: '/editorial-policy', name: 'السياسة التحريرية' },
  { path: '/privacy', name: 'الخصوصية' },
  { path: '/contact', name: 'اتصل بنا' },

  // ── ما يجب أن يكون قد حُذف ───────────────────
  { path: '/saudi', name: 'قسم السعودية (محذوف)', status: 404 },

  // ── الملفات والواجهات ────────────────────────
  {
    path: '/api/calendar/2026',
    name: 'ملف التقويم',
    contentType: 'text/calendar',
    expect: ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'END:VCALENDAR'],
  },
  { path: '/api/calendar/1899', name: 'تقويم بموسم غير صالح', status: 400 },
  { path: '/api/calendar/../../etc/passwd', name: 'حقن مسار في التقويم', mustNotSucceed: true },
  { path: '/api/calendar/2026abc', name: 'موسم غير رقمي', mustNotSucceed: true },
  { path: '/api/calendar/%2e%2e%2f%2e%2e%2fetc', name: 'حقن مسار مُرمَّز', mustNotSucceed: true },
  { path: '/sitemap.xml', name: 'خريطة الموقع', expect: ['<urlset', '/circuits/'] },
  { path: '/robots.txt', name: 'robots', expect: ['User-Agent'] },
  { path: '/layouts/monza.svg', name: 'مخطّط مونزا', contentType: 'image/svg', expect: ['<svg', 'path'] },

  // ── صفحة غير موجودة ─────────────────────────
  { path: '/hopefully-not-a-real-page', name: 'صفحة مفقودة', status: 404 },
];

async function run(): Promise<void> {
  const baseArg = process.argv.indexOf('--base');
  const base = (baseArg > -1 ? process.argv[baseArg + 1] : 'http://localhost:3000').replace(/\/$/, '');

  console.log(`▶ اختبار ${CHECKS.length} مساراً على ${base}\n`);

  let passed = 0;
  const failures: string[] = [];

  for (const check of CHECKS) {
    const expectedStatus = check.status ?? 200;
    const label = check.name.padEnd(28);

    let response: Response;
    let body = '';

    try {
      response = await fetch(`${base}${check.path}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(120_000),
      });
      body = await response.text();
    } catch (error) {
      failures.push(`${check.name} — تعذّر الوصول: ${error instanceof Error ? error.message : error}`);
      console.log(`  ✗ ${label} تعذّر الوصول`);
      continue;
    }

    const problems: string[] = [];

    if (check.mustNotSucceed) {
      // المطلوب الرفض — وأي رمز رفض مقبول، 4xx كان أو 5xx
      if (response.status < 400) {
        problems.push(`نجح بالحالة ${response.status} ويجب أن يُرفض`);
      }
    } else if (response.status !== expectedStatus) {
      problems.push(`الحالة ${response.status} بدل ${expectedStatus}`);
    }

    if (check.contentType) {
      const actual = response.headers.get('content-type') ?? '';
      if (!actual.includes(check.contentType)) {
        problems.push(`النوع «${actual}» لا يطابق «${check.contentType}»`);
      }
    }

    for (const needle of check.expect ?? []) {
      if (!body.includes(needle)) problems.push(`ينقص «${needle}»`);
    }

    for (const needle of check.reject ?? []) {
      if (body.includes(needle)) problems.push(`ظهر «${needle}» ولا يجب`);
    }

    /**
     * أي صفحة تعرض أثر خطأ Next تُعدّ فاشلة ولو أعادت 200.
     * هذا ما يمسك «الصفحة تعمل لكنها تعرض رسالة خطأ».
     */
    if (!check.mustNotSucceed && expectedStatus === 200 && /Application error|Internal Server Error|Unhandled Runtime/i.test(body)) {
      problems.push('تحتوي أثر خطأ تشغيل');
    }

    if (problems.length === 0) {
      passed += 1;
      console.log(`  ✓ ${label} ${response.status}`);
    } else {
      failures.push(`${check.name}: ${problems.join(' · ')}`);
      console.log(`  ✗ ${label} ${problems.join(' · ')}`);
    }
  }

  /**
   * ترويسات الأمان.
   *
   * تُفحص هنا لا في مراجعة يدوية: ترويسة ناقصة لا تكسر أي صفحة، فلا شيء
   * يكشفها إلا فحص صريح. وقد أُضيفت بعد تدقيق أمني وجد `/admin` قابلة
   * للتأطير — فالانحدار عنها انحدار عن إصلاح معروف.
   */
  const REQUIRED_HEADERS: [string, string][] = [
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY'],
    ['content-security-policy', "frame-ancestors 'none'"],
    ['strict-transport-security', 'max-age='],
    ['referrer-policy', 'strict-origin'],
  ];

  console.log('\n▶ ترويسات الأمان');
  let headerPass = 0;

  try {
    const response = await fetch(`${base}/`, { signal: AbortSignal.timeout(60_000) });
    for (const [name, expected] of REQUIRED_HEADERS) {
      const actual = response.headers.get(name) ?? '';
      if (actual.includes(expected)) {
        headerPass += 1;
        console.log(`  ✓ ${name.padEnd(28)} ${actual.slice(0, 40)}`);
      } else {
        failures.push(`ترويسة ${name}: «${actual}» لا تحوي «${expected}»`);
        console.log(`  ✗ ${name.padEnd(28)} ناقصة أو خاطئة`);
      }
    }
  } catch {
    failures.push('تعذّر فحص الترويسات');
  }

  console.log('\n── الخلاصة ─────────────────────');
  console.log(`مسارات : ${passed} / ${CHECKS.length}`);
  console.log(`ترويسات: ${headerPass} / ${REQUIRED_HEADERS.length}`);

  if (failures.length > 0) {
    console.log(`فشل : ${failures.length}\n`);
    for (const failure of failures) console.log(`   • ${failure}`);
    process.exit(1);
  }

  console.log('✓ كل الفحوص نجحت.');
}

run().catch((error) => {
  console.error('\n✗ فشل الاختبار:', error instanceof Error ? error.message : error);
  process.exit(1);
});
