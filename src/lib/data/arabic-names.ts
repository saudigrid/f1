/**
 * تعريب المعرّفات القادمة من واجهة النتائج.
 *
 * الواجهة تعطي أسماء إنجليزية ومعرّفات ثابتة. هذا الملف يحوّلها لعربية.
 * أي معرّف غير معروف يعود بالإنجليزية **مع تحذير في سجلّ المزامنة** — فلا
 * يختفي سائق جديد بصمت، ولا يظهر معرّف خام أمام القارئ.
 *
 * حين ينضم سائق أو فريق جديد، أضف سطراً هنا فقط.
 */

/** السائقون — المفتاح هو driverId من الواجهة. */
export const DRIVER_NAMES_AR: Record<string, string> = {
  albon: 'أليكس ألبون',
  alonso: 'فرناندو ألونسو',
  antonelli: 'كيمي أنتونيلي',
  arvid_lindblad: 'أرفيد ليندبلاد',
  bearman: 'أوليفر بيرمان',
  bortoleto: 'غابرييل بورتوليتو',
  bottas: 'فالتيري بوتاس',
  colapinto: 'فرانكو كولابينتو',
  gasly: 'بيير غاسلي',
  hadjar: 'إيزاك حجار',
  hamilton: 'لويس هاميلتون',
  hulkenberg: 'نيكو هولكنبرغ',
  lawson: 'ليام لوسون',
  leclerc: 'شارل لوكلير',
  max_verstappen: 'ماكس فيرستابن',
  norris: 'لاندو نوريس',
  ocon: 'إستيبان أوكون',
  perez: 'سيرجيو بيريز',
  piastri: 'أوسكار بياستري',
  russell: 'جورج راسل',
  sainz: 'كارلوس ساينز',
  stroll: 'لانس سترول',
  tsunoda: 'يوكي تسونودا',
};

/** الفرق — المفتاح هو constructorId. */
export const TEAM_NAMES_AR: Record<string, string> = {
  alpine: 'ألبين',
  aston_martin: 'أستون مارتن',
  audi: 'أودي',
  cadillac: 'كاديلاك',
  ferrari: 'فيراري',
  haas: 'هاس',
  mclaren: 'مكلارين',
  mercedes: 'مرسيدس',
  rb: 'ريسينغ بُلز',
  red_bull: 'ريد بُل',
  williams: 'ويليامز',
};

/**
 * ألوان الفرق ووحدات الطاقة والقواعد — لا توفّرها الواجهة، فنحتفظ بها هنا.
 * اللون يُستخدم كشريط تمييز فقط، لا كخلفية.
 */
export const TEAM_DETAILS: Record<string, { color: string; powerUnit: string; base: string }> = {
  alpine: { color: '#00A1E8', powerUnit: 'Mercedes', base: 'إنستون، بريطانيا' },
  aston_martin: { color: '#229971', powerUnit: 'Honda', base: 'سيلفرستون، بريطانيا' },
  audi: { color: '#00786F', powerUnit: 'Audi', base: 'هينفيل، سويسرا' },
  cadillac: { color: '#C7A76C', powerUnit: 'Ferrari', base: 'فيشرز، الولايات المتحدة' },
  ferrari: { color: '#E8002D', powerUnit: 'Ferrari', base: 'مارانيلو، إيطاليا' },
  haas: { color: '#B6BABD', powerUnit: 'Ferrari', base: 'كانابولِس، الولايات المتحدة' },
  mclaren: { color: '#FF8000', powerUnit: 'Mercedes', base: 'ووكينغ، بريطانيا' },
  mercedes: { color: '#27F4D2', powerUnit: 'Mercedes', base: 'براكلي، بريطانيا' },
  rb: { color: '#6692FF', powerUnit: 'Red Bull Ford', base: 'فاينزا، إيطاليا' },
  red_bull: { color: '#3671C6', powerUnit: 'Red Bull Ford', base: 'ميلتون كينز، بريطانيا' },
  williams: { color: '#1868DB', powerUnit: 'Mercedes', base: 'غروف، بريطانيا' },
};

/** أسماء الجوائز الكبرى — المفتاح هو raceName كما تعيده الواجهة حرفياً. */
export const RACE_NAMES_AR: Record<string, string> = {
  'Australian Grand Prix': 'جائزة أستراليا الكبرى',
  'Austrian Grand Prix': 'جائزة النمسا الكبرى',
  'Azerbaijan Grand Prix': 'جائزة أذربيجان الكبرى',
  'Bahrain Grand Prix': 'جائزة البحرين الكبرى',
  'Bahrain Grand Prix in Malaysia': 'جائزة البحرين الكبرى في ماليزيا',
  'Barcelona Grand Prix': 'جائزة برشلونة الكبرى',
  'Belgian Grand Prix': 'جائزة بلجيكا الكبرى',
  'Brazilian Grand Prix': 'جائزة البرازيل الكبرى',
  'British Grand Prix': 'جائزة بريطانيا الكبرى',
  'Canadian Grand Prix': 'جائزة كندا الكبرى',
  'Chinese Grand Prix': 'جائزة الصين الكبرى',
  'Dutch Grand Prix': 'جائزة هولندا الكبرى',
  'Emilia Romagna Grand Prix': 'جائزة إميليا رومانيا الكبرى',
  'Hungarian Grand Prix': 'جائزة المجر الكبرى',
  'Italian Grand Prix': 'جائزة إيطاليا الكبرى',
  'Japanese Grand Prix': 'جائزة اليابان الكبرى',
  'Las Vegas Grand Prix': 'جائزة لاس فيغاس الكبرى',
  'Mexico City Grand Prix': 'جائزة مكسيكو سيتي الكبرى',
  'Miami Grand Prix': 'جائزة ميامي الكبرى',
  'Monaco Grand Prix': 'جائزة موناكو الكبرى',
  'Qatar Grand Prix': 'جائزة قطر الكبرى',
  'Saudi Arabian Grand Prix': 'جائزة السعودية الكبرى',
  'Singapore Grand Prix': 'جائزة سنغافورة الكبرى',
  'Spanish Grand Prix': 'جائزة إسبانيا الكبرى',
  'United States Grand Prix': 'جائزة الولايات المتحدة الكبرى',
  'Abu Dhabi Grand Prix': 'جائزة أبوظبي الكبرى',
};

/** الحلبات — المفتاح هو circuitId. */
export const CIRCUIT_NAMES_AR: Record<string, string> = {
  albert_park: 'حلبة ألبرت بارك',
  americas: 'حلبة الأمريكتين',
  bahrain: 'حلبة البحرين الدولية',
  baku: 'حلبة مدينة باكو',
  catalunya: 'حلبة كتالونيا',
  hungaroring: 'حلبة هنغارورينغ',
  interlagos: 'حلبة إنترلاغوس',
  jeddah: 'حلبة كورنيش جدة',
  losail: 'حلبة لوسيل الدولية',
  madring: 'حلبة مدريد',
  marina_bay: 'حلبة مارينا باي',
  miami: 'حلبة ميامي الدولية',
  monaco: 'حلبة موناكو',
  monza: 'حلبة مونزا',
  red_bull_ring: 'حلبة ريد بُل رينغ',
  rodriguez: 'حلبة الأخوين رودريغيز',
  sepang: 'حلبة سيبانغ الدولية',
  shanghai: 'حلبة شنغهاي الدولية',
  silverstone: 'حلبة سيلفرستون',
  spa: 'حلبة سبا-فرانكورشان',
  suzuka: 'حلبة سوزوكا',
  vegas: 'حلبة لاس فيغاس',
  villeneuve: 'حلبة جيل فيلنوف',
  yas_marina: 'حلبة مرسى ياس',
  zandvoort: 'حلبة زاندفورت',
};

/** الدول: الاسم كما تعيده الواجهة ← العربية ورمز العلم. */
export const COUNTRIES: Record<string, { ar: string; code: string }> = {
  Australia: { ar: 'أستراليا', code: 'AU' },
  Austria: { ar: 'النمسا', code: 'AT' },
  Azerbaijan: { ar: 'أذربيجان', code: 'AZ' },
  Bahrain: { ar: 'البحرين', code: 'BH' },
  Belgium: { ar: 'بلجيكا', code: 'BE' },
  Brazil: { ar: 'البرازيل', code: 'BR' },
  Canada: { ar: 'كندا', code: 'CA' },
  China: { ar: 'الصين', code: 'CN' },
  Hungary: { ar: 'المجر', code: 'HU' },
  Italy: { ar: 'إيطاليا', code: 'IT' },
  Japan: { ar: 'اليابان', code: 'JP' },
  Malaysia: { ar: 'ماليزيا', code: 'MY' },
  Mexico: { ar: 'المكسيك', code: 'MX' },
  Monaco: { ar: 'موناكو', code: 'MC' },
  Netherlands: { ar: 'هولندا', code: 'NL' },
  Qatar: { ar: 'قطر', code: 'QA' },
  'Saudi Arabia': { ar: 'السعودية', code: 'SA' },
  Singapore: { ar: 'سنغافورة', code: 'SG' },
  Spain: { ar: 'إسبانيا', code: 'ES' },
  UAE: { ar: 'الإمارات', code: 'AE' },
  UK: { ar: 'بريطانيا', code: 'GB' },
  USA: { ar: 'الولايات المتحدة', code: 'US' },
};

/** جنسية السائق كما تعيدها الواجهة ← رمز العلم. */
export const NATIONALITY_CODES: Record<string, string> = {
  Argentine: 'AR',
  Australian: 'AU',
  Brazilian: 'BR',
  British: 'GB',
  Canadian: 'CA',
  Dutch: 'NL',
  Finnish: 'FI',
  French: 'FR',
  German: 'DE',
  Italian: 'IT',
  Japanese: 'JP',
  Mexican: 'MX',
  Monegasque: 'MC',
  'New Zealander': 'NZ',
  Spanish: 'ES',
  Thai: 'TH',
};

/** المعرّفات التي لم نجد لها ترجمة — تُجمع ليطبعها سكربت المزامنة في النهاية. */
export const missingTranslations = new Set<string>();

/**
 * يترجم معرّفاً، ويعود للاسم الإنجليزي إن لم يوجد — مع تسجيل النقص.
 * لا نرمي استثناءً: سائق جديد يجب ألا يُعطّل مزامنة الموسم كله.
 */
export function translate(
  map: Record<string, string>,
  key: string,
  fallback: string,
  kind: string,
): string {
  const found = map[key];
  if (found) return found;
  missingTranslations.add(`${kind}: ${key} (${fallback})`);
  return fallback;
}
