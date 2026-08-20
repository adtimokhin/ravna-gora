import { Link } from "../../../i18n/navigation";
import { SectionHeading } from "./SectionHeading";
import { CatalogCard } from "./CatalogCard";

type HistoryArticle = {
  slug: string;
  title: string;
  pictureUrl: string;
};

export function RecentHistorySection({
  heading,
  articles,
  emptyLabel,
  viewAllHref,
  viewAllLabel,
}: {
  heading: string;
  articles: HistoryArticle[];
  emptyLabel: string;
  viewAllHref: string;
  viewAllLabel: string;
}) {
  return (
    <section className="flex flex-col gap-[var(--space-text-tp)]">
      <SectionHeading title={heading} />

      {articles.length === 0 ? (
        <p className="type-body text-gray-2">{emptyLabel}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-[18px] gap-y-[var(--space-card-v)]">
          {articles.map((article) => (
            <CatalogCard
              key={article.slug}
              href={`/history/${article.slug}`}
              title={article.title}
              pictureUrl={article.pictureUrl}
            />
          ))}
        </div>
      )}

      <Link
        href={viewAllHref}
        className="self-center bg-blue-2 text-white type-ui-medium px-7 py-4 text-center hover:opacity-90 transition-opacity"
      >
        {viewAllLabel}
      </Link>
    </section>
  );
}
