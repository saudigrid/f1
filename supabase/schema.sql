-- ══════════════════════════════════════════════════════════════
-- Saudi F1 Grid — مخطط قاعدة البيانات
-- شغّله في Supabase ← SQL Editor مرة واحدة.
-- ══════════════════════════════════════════════════════════════

create type article_status as enum ('ingested', 'translated', 'review', 'published', 'rejected');

create type article_category as enum (
  'breaking', 'news', 'transfers', 'technical', 'race-report', 'regulations', 'saudi'
);

-- ── الأخبار ───────────────────────────────────────────────────
create table if not exists articles (
  id              text primary key,
  slug            text not null unique,
  title           text not null,
  excerpt         text not null,
  body            text not null,
  category        article_category not null default 'news',
  tags            text[] not null default '{}',
  hero_image      text,
  hero_image_alt  text not null default '',
  -- نسبة الصورة: مصوّر وترخيص أو ناشر. شرط لعرض الصورة، لا حقل تجميلي.
  hero_image_credit jsonb,
  published_at    timestamptz not null default now(),
  updated_at      timestamptz,
  reading_minutes integer not null default 2,
  status          article_status not null default 'review',
  -- المصادر إلزامية للنشر: القيد أدناه يمنع نشر خبر بلا إسناد
  sources         jsonb not null default '[]'::jsonb,
  -- تقرير وكيل التدقيق — داخلي بالكامل، لا يُقرأ علناً أبداً
  fact_check      jsonb,
  human_reviewed  boolean not null default false,
  created_at      timestamptz not null default now(),

  constraint published_needs_sources
    check (status <> 'published' or jsonb_array_length(sources) > 0)
);

create index if not exists articles_feed_idx
  on articles (status, published_at desc);

create index if not exists articles_category_idx
  on articles (category, status, published_at desc);

-- بحث نصّي عربي داخل العناوين والملخّصات
create index if not exists articles_search_idx
  on articles using gin (to_tsvector('simple', title || ' ' || excerpt));

-- ── البيانات المرجعية ─────────────────────────────────────────
create table if not exists teams (
  id          text primary key,
  name        text not null,
  "nameEn"    text not null,
  color       text not null default '#888888',
  base        text not null default '',
  "powerUnit" text not null default ''
);

create table if not exists drivers (
  id            text primary key,
  name          text not null,
  "nameEn"      text not null,
  number        integer not null,
  "teamId"      text not null references teams (id) on delete cascade,
  "countryCode" text not null default ''
);

create table if not exists races (
  id            text primary key,
  round         integer not null,
  name          text not null,
  "nameEn"      text not null,
  circuit       text not null,
  country       text not null,
  "countryCode" text not null default '',
  "startsAt"    timestamptz not null,
  laps          integer not null default 0,
  status        text not null default 'upcoming',
  podium        jsonb
);

create table if not exists standings (
  season        integer primary key,
  "updatedAt"   timestamptz not null default now(),
  drivers       jsonb not null default '[]'::jsonb,
  constructors  jsonb not null default '[]'::jsonb
);

-- ══════════════════════════════════════════════════════════════
-- أمن الصفوف (RLS)
--
-- التطبيق يقرأ بمفتاح service_role من الخادم فيتجاوز هذه السياسات.
-- السياسات هنا خط دفاع ثانٍ: لو تسرّب المفتاح العام يوماً، لن يستطيع
-- أحد قراءة خبر غير منشور ولا رؤية أي تقرير تدقيق.
-- ══════════════════════════════════════════════════════════════

alter table articles enable row level security;
alter table teams    enable row level security;
alter table drivers  enable row level security;
alter table races    enable row level security;
alter table standings enable row level security;

create policy "المنشور فقط للعامة"
  on articles for select
  to anon, authenticated
  using (status = 'published');

create policy "البيانات المرجعية عامة للقراءة"
  on teams for select to anon, authenticated using (true);

create policy "السائقون عامون للقراءة"
  on drivers for select to anon, authenticated using (true);

create policy "السباقات عامة للقراءة"
  on races for select to anon, authenticated using (true);

create policy "الترتيب عام للقراءة"
  on standings for select to anon, authenticated using (true);

-- لا سياسات كتابة إطلاقاً: الكتابة حصراً عبر service_role من الخادم.

-- ══════════════════════════════════════════════════════════════
-- عرض عام آمن: يحجب عمود fact_check حتى في حال خطأ في سياسة مستقبلية
-- ══════════════════════════════════════════════════════════════
create or replace view public_articles as
  select
    id, slug, title, excerpt, body, category, tags,
    hero_image, hero_image_alt, hero_image_credit, published_at, updated_at,
    reading_minutes, sources
  from articles
  where status = 'published';
