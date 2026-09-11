/**
 * مركّبات بيريللي وألوانها الرسمية.
 *
 * الألوان ليست اختياراً جمالياً بل **لغة متفق عليها** في هذه الرياضة: المشاهد
 * يقرأ الشريط الأحمر «طري» قبل أن يقرأ الكلمة. فأي لوحة استراتيجية تخترع
 * ألوانها تُفقد القارئ ما يعرفه أصلاً.
 */
export const COMPOUNDS: Record<
  string,
  { label: string; short: string; colour: string; note: string }
> = {
  SOFT: {
    label: 'طري',
    short: 'S',
    colour: '#e10600',
    note: 'الأسرع لفةً والأقصر عمراً',
  },
  MEDIUM: {
    label: 'متوسط',
    short: 'M',
    colour: '#ffd800',
    note: 'توازن بين السرعة والعمر',
  },
  HARD: {
    label: 'صلب',
    short: 'H',
    colour: '#e8e8ea',
    note: 'الأبطأ لفةً والأطول عمراً',
  },
  INTERMEDIATE: {
    label: 'متوسط مبلّل',
    short: 'I',
    colour: '#43b02a',
    note: 'لمسار رطب بلا برك',
  },
  WET: {
    label: 'مبلّل',
    short: 'W',
    colour: '#0067ad',
    note: 'للمطر الغزير والبرك',
  },
  UNKNOWN: {
    label: 'غير مذكور',
    short: '؟',
    colour: '#52525b',
    note: 'لم تُنشر بيانات المركّب',
  },
};

export function compound(name: string | null | undefined) {
  if (!name) return COMPOUNDS.UNKNOWN;
  return COMPOUNDS[name.toUpperCase()] ?? COMPOUNDS.UNKNOWN;
}

/** المركّبات التي تظهر في مفتاح الألوان — بلا «غير مذكور». */
export const LEGEND_COMPOUNDS = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'] as const;
