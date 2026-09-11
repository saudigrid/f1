import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AdSlot from "@/components/ads/AdSlot";
import NewsGrid from "@/components/news/NewsGrid";
import { articleCategories, categoryLabel } from "@/lib/config/site";
import { getRepo } from "@/lib/data/repo";

export const revalidate = 300;

export function generateStaticParams() {
  return articleCategories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const label = categoryLabel(category);
  return {
    title: `${label} — الفورمولا 1`,
    description: `آخر أخبار وتحليلات ${label} في عالم الفورمولا 1 بالعربية.`,
    alternates: { canonical: `/c/${category}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!articleCategories.some((c) => c.slug === category)) notFound();

  const repo = await getRepo();
  const articles = await repo.listArticles({ category, limit: 30 });
  const label = categoryLabel(category);

  return (
    <div className="page py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black">
          <span className="speedbar" aria-hidden />
          {label}
        </h1>
        <p className="mt-2 text-text-dim">
          <span className="numeric">{articles.length}</span> خبراً في هذا القسم
        </p>
      </header>

      <AdSlot placement="header-leaderboard" className="mb-8" />

      <NewsGrid articles={articles} />
    </div>
  );
}
