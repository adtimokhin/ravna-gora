import { getTranslations } from "next-intl/server";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { CatalogHeader } from "../../components/ui/CatalogHeader";
import { CatalogCard } from "../../components/ui/CatalogCard";
import { client } from "../../../sanity/lib/client";
import { urlFor, type SanityImage } from "../../../sanity/lib/image";

export const revalidate = 60;

// Figma MCP asset URL — expires 7 days after generation
// FIXME: no purpose-built header image exists for this catalog page yet — reusing the home page hero as a placeholder
const A = {
  hero: "/images/landing-hero-original/1512.avif",
};

type HistoryCard = { _id: string; slug: string; title: string; picture: SanityImage };

async function getHistoryPages(locale: string): Promise<HistoryCard[]> {
  return client.fetch(
    `*[_type == "historyPage" && defined(added_at) && (language == $locale || (!defined(language) && $locale == "en"))] | order(added_at desc) {
      _id,
      "slug": slug.current,
      title,
      picture
    }`,
    { locale }
  );
}

export default async function HistoryCatalog({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("history");
  const historyPages = await getHistoryPages(locale);

  return (
    <div className="min-h-screen bg-offwhite-1 flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-[1512px] mx-auto px-4 md:px-6 xl:px-10 pt-[var(--space-8)] flex flex-col gap-[var(--space-8)]">

          <CatalogHeader
            imageSrc={A.hero}
            imageAlt={t("imageAlt")}
            title={t("title")}
            description={t("description")}
          />

          <div className="flex flex-col gap-[var(--space-9)] pb-[var(--space-8)]">
            {historyPages.length === 0 ? (
              <p className="type-body text-gray-2">{t("noPages")}</p>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-x-[20px] gap-y-[var(--space-card-v)] w-full">
                {historyPages.map((page) => (
                  <CatalogCard
                    key={page._id}
                    href={`/history/${page.slug}`}
                    title={page.title}
                    pictureUrl={urlFor(page.picture).width(700).auto("format").url()}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
