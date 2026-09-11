/**
 * ⚠️ Ergast يسجّل «لوتس-كلايمكس» و«لوتس-فورد» و«لوتس-بي آر إم» صانعين
 * **مستقلّين** عن «فريق لوتس»، لأن تسميته في الستينيات كانت تجمع الهيكل
 * بالمحرّك. النتيجة أن تاريخ لوتس الواحد يتشظّى على أربعة معرّفات: 45 انتصاراً
 * هنا و22 هناك و11 في ثالث — ولا واحد منها يقول الحقيقة.
 *
 * فنُعيد لحمها. الدمج تحريري لا آلي: كل مدخل هنا فريق واحد فعلاً غيّر مورّد
 * محرّكه، وليس فريقين تشابه اسماهما.
 *
 * ⚠️ ما ليس في القائمة لا يُدمج ولو حمل شرطة: «تك-مك» و«أرزاني-فولبيني»
 * و«بيهرا-بورشه» أسماء صانعين مستقلّين، لا هيكل + محرّك.
 */
export const TEAM_ALIASES: Record<string, string> = {
  'lotus-climax': 'team_lotus',
  'lotus-ford': 'team_lotus',
  'lotus-brm': 'team_lotus',
  'lotus-borgward': 'team_lotus',
  'lotus-maserati': 'team_lotus',
  'lotus-pw': 'team_lotus',
  'cooper-climax': 'cooper',
  'cooper-maserati': 'cooper',
  'cooper-alfa_romeo': 'cooper',
  'cooper-ats': 'cooper',
  'cooper-borgward': 'cooper',
  'cooper-brm': 'cooper',
  'cooper-castellotti': 'cooper',
  'cooper-ferrari': 'cooper',
  'cooper-ford': 'cooper',
  'cooper-osca': 'cooper',
  'brabham-repco': 'brabham',
  'brabham-climax': 'brabham',
  'brabham-ford': 'brabham',
  'brabham-alfa_romeo': 'brabham',
  'brabham-brm': 'brabham',
  'matra-ford': 'matra',
  'mclaren-ford': 'mclaren',
  'mclaren-alfa_romeo': 'mclaren',
  'mclaren-brm': 'mclaren',
  'mclaren-seren': 'mclaren',
  'eagle-weslake': 'eagle',
  'eagle-climax': 'eagle',
  'brm-ford': 'brm',
  'march-alfa_romeo': 'march',
  'march-ford': 'march',
  'shadow-ford': 'shadow',
  'shadow-matra': 'shadow',
  'de_tomaso-alfa_romeo': 'tomaso',
  'de_tomaso-ferrari': 'tomaso',
  'de_tomaso-osca': 'tomaso',
  'lds-alfa_romeo': 'lds',
  'lds-climax': 'lds',
};

/** المعرّف القانوني لأي معرّف Ergast. */
export function canonicalTeamId(id: string): string {
  return TEAM_ALIASES[id] ?? id;
}
