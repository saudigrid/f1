/**
 * أسماء الفرق بالعربية وألوانها.
 *
 * ## لماذا مكتوبة بيد
 *
 * لا واجهة مفتوحة تعطي اسم فريق قديم بالعربية، والنقحرة الآلية تُخرج مسوخاً
 * («تيريل» تصير «تيرريلل»). وهذه أسماء **لا تتغيّر**: تايرل انتهى سنة 1998،
 * فلا معنى لسؤال خدمة ترجمة عنه في كل بناء.
 *
 * ## لماذا لا كل الفرق
 *
 * 214 صانعاً منذ 1950، أكثر من نصفهم دخل سباقاً واحداً بسيارة صنعها في مرآب
 * — أسماء أعلام إنجليزية لا مقابل عربياً لها ولا يعرفها أحد. تلك تُعرض
 * بحروفها اللاتينية، وهو أصدق من نقحرة مخترعة.
 *
 * ## اللون
 *
 * لون الفريق التاريخي حين يكون معروفاً (أخضر لوتس البريطاني، أزرق تايرل،
 * أصفر جوردان). ومن لا لون موثّقاً له يأخذ لوناً مشتقّاً من معرّفه في
 * `TeamCrest` — ثابتاً لا عشوائياً، فالبطاقة نفسها تظهر باللون نفسه دائماً.
 */

export interface TeamName {
  ar: string;
  /** اللون التاريخي — يُترك فارغاً لمن لا لون موثّقاً له. */
  color?: string;
}

export const TEAM_NAMES: Record<string, TeamName> = {
  // ── الفرق الحالية ─────────────────────────────
  ferrari: { ar: 'فيراري', color: '#E8002D' },
  mclaren: { ar: 'مكلارين', color: '#FF8000' },
  mercedes: { ar: 'مرسيدس', color: '#27F4D2' },
  red_bull: { ar: 'ريد بُل', color: '#3671C6' },
  williams: { ar: 'ويليامز', color: '#64C4FF' },
  aston_martin: { ar: 'أستون مارتن', color: '#229971' },
  alpine: { ar: 'ألبين', color: '#FF87BC' },
  haas: { ar: 'هاس', color: '#B6BABD' },
  sauber: { ar: 'زاوبر', color: '#52E252' },
  rb: { ar: 'ريسينغ بُلز', color: '#6692FF' },
  audi: { ar: 'أودي', color: '#BB0A30' },
  cadillac: { ar: 'كاديلاك', color: '#C4972F' },

  // ── الفرق الكبرى التي رحلت ────────────────────
  team_lotus: { ar: 'فريق لوتس', color: '#0F5132' },
  brabham: { ar: 'برابهام', color: '#1C4B8C' },
  tyrrell: { ar: 'تايرل', color: '#0B57A4' },
  brm: { ar: 'بي آر إم', color: '#0D4D2B' },
  cooper: { ar: 'كوبر', color: '#0A6E3C' },
  vanwall: { ar: 'فانوول', color: '#0C5C34' },
  maserati: { ar: 'مازيراتي', color: '#B01B2E' },
  alfa: { ar: 'ألفا روميو', color: '#8C1C2B' },
  matra: { ar: 'ماترا', color: '#1B5BA0' },
  ligier: { ar: 'ليجييه', color: '#1F6FD0' },
  benetton: { ar: 'بينيتون', color: '#009B48' },
  renault: { ar: 'رينو', color: '#FFD400' },
  jordan: { ar: 'جوردان', color: '#F5C400' },
  march: { ar: 'مارتش', color: '#D33A2C' },
  arrows: { ar: 'آروز', color: '#E85D1F' },
  minardi: { ar: 'مينارّدي', color: '#1A1A1A' },
  lola: { ar: 'لولا', color: '#B4171F' },
  shadow: { ar: 'شادو', color: '#111111' },
  hesketh: { ar: 'هيسكيث', color: '#C8102E' },
  wolf: { ar: 'وولف', color: '#0B2545' },
  penske: { ar: 'بنسكي', color: '#C8102E' },
  surtees: { ar: 'سيرتيز', color: '#C8102E' },
  ensign: { ar: 'إنساين' },
  fittipaldi: { ar: 'فيتيبالدي', color: '#D6A21C' },
  toleman: { ar: 'توليمان', color: '#1F4E9C' },
  osella: { ar: 'أوسيلا' },
  ats: { ar: 'إيه تي إس' },
  zakspeed: { ar: 'زاكشبيد', color: '#B01B2E' },
  larrousse: { ar: 'لاروس', color: '#123C7A' },
  coloni: { ar: 'كولوني' },
  dallara: { ar: 'دالارا' },
  ags: { ar: 'إيه جي إس' },
  footwork: { ar: 'فوتوورك', color: '#E85D1F' },
  fondmetal: { ar: 'فوندميتال' },
  simtek: { ar: 'سيمتك' },
  pacific: { ar: 'باسيفيك' },
  forti: { ar: 'فورتي', color: '#F5C400' },
  stewart: { ar: 'ستيوارت', color: '#FFFFFF' },
  prost: { ar: 'بروست', color: '#0B57A4' },
  bar: { ar: 'بي إيه آر', color: '#C8102E' },
  jaguar: { ar: 'جاغوار', color: '#0B5B3B' },
  toyota: { ar: 'تويوتا', color: '#C8102E' },
  honda: { ar: 'هوندا', color: '#C8102E' },
  bmw_sauber: { ar: 'بي إم دبليو زاوبر', color: '#1D4F91' },
  super_aguri: { ar: 'سوبر أغوري', color: '#C8102E' },
  spyker: { ar: 'سبايكر', color: '#E85D1F' },
  spyker_mf1: { ar: 'سبايكر إم إف 1', color: '#E85D1F' },
  mf1: { ar: 'إم إف 1', color: '#C8102E' },
  brawn: { ar: 'براون', color: '#B8E63C' },
  force_india: { ar: 'فورس إنديا', color: '#E85D1F' },
  racing_point: { ar: 'ريسينغ بوينت', color: '#F596C8' },
  toro_rosso: { ar: 'تورو روسو', color: '#1E41A0' },
  alphatauri: { ar: 'ألفا تاوري', color: '#2B4562' },
  lotus_f1: { ar: 'لوتس', color: '#000000' },
  lotus_racing: { ar: 'لوتس ريسينغ', color: '#0F5132' },
  caterham: { ar: 'كاترهام', color: '#0F5132' },
  hrt: { ar: 'إتش آر تي', color: '#8C8C8C' },
  virgin: { ar: 'فيرجن', color: '#C8102E' },
  marussia: { ar: 'ماروسيا', color: '#C8102E' },
  manor: { ar: 'مانور', color: '#C8102E' },
  onyx: { ar: 'أونيكس' },
  rial: { ar: 'ريال' },
  eurobrun: { ar: 'يوروبرون' },
  lambo: { ar: 'لامبورغيني', color: '#0F5132' },
  moda: { ar: 'أندريا مودا', color: '#111111' },
  life: { ar: 'لايف' },
  scirocco: { ar: 'شيروكو' },
  maki: { ar: 'ماكي' },
  kojima: { ar: 'كوجيما' },
  token: { ar: 'توكن' },
  trojan: { ar: 'تروجان' },
  lec: { ar: 'إل إي سي' },
  boro: { ar: 'بورو' },
  ram: { ar: 'رام' },
  theodore: { ar: 'ثيودور' },
  merzario: { ar: 'ميرزاريو' },
  kauhsen: { ar: 'كاوزن' },
  rebaque: { ar: 'ريباكي' },
  spirit: { ar: 'سبيريت' },
  connew: { ar: 'كونيو' },
  politoys: { ar: 'بوليتويز' },
  iso_marlboro: { ar: 'إيزو مارلبورو' },
  amon: { ar: 'آمون' },
  // ⚠️ «Automobiles Martini» الفرنسي — لا علاقة له براعي ويليامز
  martini: { ar: 'مارتيني' },
  tecno: { ar: 'تكنو' },
  bellasi: { ar: 'بيلاسي' },

  // ── الرعيل الأول ──────────────────────────────
  gordini: { ar: 'غورديني', color: '#1B5BA0' },
  hwm: { ar: 'إتش دبليو إم', color: '#0D4D2B' },
  connaught: { ar: 'كونوت', color: '#0D4D2B' },
  era: { ar: 'إي آر إيه', color: '#0D4D2B' },
  alta: { ar: 'ألتا' },
  frazer_nash: { ar: 'فريزر ناش' },
  lancia: { ar: 'لانشا', color: '#B01B2E' },
  osca: { ar: 'أوسكا', color: '#B01B2E' },
  bugatti: { ar: 'بوغاتي', color: '#1B5BA0' },
  porsche: { ar: 'بورشه', color: '#B4B4B4' },
  simca: { ar: 'سيمكا' },
  emeryson: { ar: 'إميرسون' },
  scarab: { ar: 'سكاراب' },
  eagle: { ar: 'إيغل', color: '#0B2545' },
  tomaso: { ar: 'دي توماسو' },
  cisitalia: { ar: 'تشيزيتاليا' },
  veritas: { ar: 'فيريتاس' },
  afm: { ar: 'إيه إف إم' },
  emw: { ar: 'إي إم دبليو' },
  bmw: { ar: 'بي إم دبليو', color: '#1D4F91' },
  lds: { ar: 'إل دي إس' },
  klenk: { ar: 'كلينك' },
  nichels: { ar: 'نيكلز' },
  kurtis_kraft: { ar: 'كورتِس كرافت' },
  watson: { ar: 'واتسون' },
  epperly: { ar: 'إبرلي' },
  kuzma: { ar: 'كوزما' },
  lesovsky: { ar: 'ليسوفسكي' },
  phillips: { ar: 'فيليبس' },
  stevens: { ar: 'ستيفنز' },
  trevis: { ar: 'تريفيس' },
  dunn: { ar: 'دَن' },
  adams: { ar: 'آدامز' },
  sherman: { ar: 'شيرمان' },
  schroeder: { ar: 'شرودر' },
  langley: { ar: 'لانغلي' },
  moore: { ar: 'مور' },
  olson: { ar: 'أولسون' },
  turner: { ar: 'تيرنر' },
  hall: { ar: 'هول' },
  elder: { ar: 'إلدر' },
  ferguson: { ar: 'فيرغسون' },
  fry: { ar: 'فراي' },
  sutton: { ar: 'ساتون' },
  rae: { ar: 'راي' },
  mbm: { ar: 'إم بي إم' },
  'tec-mec': { ar: 'تك-مك' },
  'arzani-volpini': { ar: 'أرزاني-فولبيني' },
  'behra-porsche': { ar: 'بيهرا-بورشه' },
  milano: { ar: 'ميلانو' },
  protos: { ar: 'بروتوس' },
  shannon: { ar: 'شانون' },
  mcguire: { ar: 'مكغواير' },
  brp: { ar: 'بي آر بي' },
  enb: { ar: 'إي إن بي' },

  /*
   * ── المعرّفات كما يكتبها Ergast ────────────────
   * ⚠️ Ergast يسمّي فريق غراهام هيل «hill» لا «embassy_hill»، و«ليتون هاوس»
   * «leyton»، و«تالبو-لاغو» «lago». المفتاح هنا **معرّف الواجهة** لا الاسم
   * المتوقّع — والاعتماد على الحدس هنا كان يعني 24 بطاقة بحروف لاتينية.
   */
  hill: { ar: 'إمباسي هيل', color: '#0B2545' },
  leyton: { ar: 'ليتون هاوس', color: '#7EC8E3' },
  lago: { ar: 'تالبو-لاغو', color: '#1B5BA0' },
  parnelli: { ar: 'بارنيلي' },
  gilby: { ar: 'غيلبي' },
  jbw: { ar: 'جيه بي دبليو' },
  bromme: { ar: 'برومي' },
  butterworth: { ar: 'أستون باترورث' },
  apollon: { ar: 'أبولون' },
  deidt: { ar: 'ديدت' },
  derrington: { ar: 'ديرينغتون' },
  ewing: { ar: 'إيوينغ' },
  lyncar: { ar: 'لينكار' },
  marchese: { ar: 'ماركيزي' },
  meskowski: { ar: 'ميسكوفسكي' },
  pankratz: { ar: 'بانكراتز' },
  pawl: { ar: 'بول' },
  re: { ar: 'آر إي' },
  snowberger: { ar: 'سنوبيرغر' },
  stebro: { ar: 'ستيبرو' },
  vhristensen: { ar: 'كريستنسن' },
  wetteroth: { ar: 'ويتيروث' },
  del_roy: { ar: 'دل روي' },
};

/** الاسم العربي إن وُجد، وإلّا فالإنجليزي كما هو. */
export function teamNameAr(id: string, fallback: string): string {
  return TEAM_NAMES[id]?.ar ?? fallback;
}
