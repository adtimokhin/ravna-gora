import { getTranslations } from "next-intl/server";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { HomeHero } from "../components/ui/HomeHero";
import { WelcomeQuote } from "../components/ui/WelcomeQuote";
import { LatestIssueCard } from "../components/ui/LatestIssueCard";
import { AboutSection } from "../components/ui/AboutSection";
import { RecentHistorySection } from "../components/ui/RecentHistorySection";
import { ChaptersSection } from "../components/ui/ChaptersSection";
import { MembershipSection } from "../components/ui/MembershipSection";
import { client } from "../../sanity/lib/client";
import { urlFor, type SanityImage } from "../../sanity/lib/image";

export const revalidate = 60;

// Figma MCP asset URLs — expires 7 days after generation
const A = {
  hero:     "/images/landing-hero-original/1512.avif", // fallback only, used when homePage.picture is unset
  magazine: "/images/preview-next-newspaper/464.avif",
  about:    "/images/about-us-section-original/1512.avif",
};

type Chapter = { name: string; websiteUrl?: string };
type LatestIssue = { picture: SanityImage | null; date: string; number: string; description: string };
type AboutData = {
  heading: string;
  paragraphs: string[];
  picture: SanityImage | null;
  photoCaption?: string;
  photoYear?: string;
  linkText: string;
};
type MembershipData = { heading: string; paragraphs: string[]; ctaText: string };
type HomePageData = {
  pageTitle: string;
  pageSubtitle: string;
  picture: SanityImage | null;
  welcomeQuote?: string;
  latestIssue: LatestIssue | null;
  about?: AboutData;
  membership?: MembershipData;
  chapters: Chapter[];
};
type RecentHistoryPage = { title: string; slug: string; picture: SanityImage };

const FALLBACK_CHAPTERS: Chapter[] = [
  { name: "United States" },
  { name: "Canada" },
  { name: "United Kingdom" },
  { name: "Australia" },
];

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");

  const [homePage, recentHistoryPages]: [HomePageData | null, RecentHistoryPage[]] = await Promise.all([
    client.fetch(
      `*[_type == "homePage" && (language == $locale || (!defined(language) && $locale == "en"))][0] {
        pageTitle,
        pageSubtitle,
        picture,
        welcomeQuote,
        latestIssue,
        about,
        membership,
        chapters
      }`,
      { locale }
    ),
    client.fetch(
      `*[_type == "historyPage" && defined(added_at) && (language == $locale || (!defined(language) && $locale == "en"))] | order(added_at desc) [0...5] {
        title,
        "slug": slug.current,
        picture
      }`,
      { locale }
    ),
  ]);

  const pageTitle    = homePage?.pageTitle    ?? t("fallbackTitle");
  const pageSubtitle = homePage?.pageSubtitle ?? t("fallbackSubtitle");
  const heroImageUrl = homePage?.picture ? urlFor(homePage.picture).width(1512).auto("format").url() : A.hero;
  const welcomeQuote = homePage?.welcomeQuote ?? t("welcomeQuote");
  const chapters     = homePage?.chapters?.length ? homePage.chapters : FALLBACK_CHAPTERS;

  const latestIssueDate        = homePage?.latestIssue?.date        ?? "March 2026";
  const latestIssueNumber      = homePage?.latestIssue?.number      ?? "#764";
  const latestIssueDescription = homePage?.latestIssue?.description ?? t("latestIssueDesc");
  const latestIssueHeading     = t("latestIssueHeading", { number: latestIssueNumber });
  const latestIssuePictureUrl  = homePage?.latestIssue?.picture
    ? urlFor(homePage.latestIssue.picture).width(700).auto("format").url()
    : A.magazine;

  const about              = homePage?.about;
  const aboutHeading       = about?.heading ?? t("aboutHeading");
  const aboutParagraphs    = about?.paragraphs?.length ? about.paragraphs : [t("aboutP1"), t("aboutP2")];
  const aboutPictureUrl    = about?.picture ? urlFor(about.picture).width(1432).auto("format").url() : A.about;
  const aboutPhotoCaption  = about?.photoCaption ?? t("photograph");
  const aboutPhotoYear     = about?.photoYear ?? t("photoYear");
  const aboutLinkText      = about?.linkText ?? t("loadMore");

  const membership           = homePage?.membership;
  const membershipHeading    = membership?.heading ?? t("membershipHeading");
  const membershipParagraphs = membership?.paragraphs?.length ? membership.paragraphs : [t("membershipP1"), t("membershipP2")];
  const membershipCtaText    = membership?.ctaText ?? t("joinCTA");

  const recentHistoryArticles = recentHistoryPages.map((page) => ({
    slug: page.slug,
    title: page.title,
    pictureUrl: urlFor(page.picture).width(700).auto("format").url(),
  }));

  return (
    <div className="min-h-screen bg-offwhite-1 flex flex-col">

      <Navbar />

      <main className="flex-1">
        <div className="max-w-[1512px] mx-auto px-4 md:px-6 xl:px-10 pt-[var(--space-8)] flex flex-col gap-[var(--space-10)]">

          {/* ── Hero ── */}
          <HomeHero title={pageTitle} subtitle={pageSubtitle} pictureUrl={heroImageUrl} />

          {/* ── All content sections ── */}
          <div className="flex flex-col gap-[var(--space-10)]">

            {/* ── Welcome quote ── */}
            <WelcomeQuote quote={welcomeQuote} />

            {/* ── Latest newspaper card ── */}
            <LatestIssueCard
              date={latestIssueDate}
              heading={latestIssueHeading}
              description={latestIssueDescription}
              pictureUrl={latestIssuePictureUrl}
              imageAlt={t("latestIssueAlt")}
            />

            {/* ── About ── */}
            <AboutSection
              heading={aboutHeading}
              paragraphs={aboutParagraphs}
              pictureUrl={aboutPictureUrl}
              photoCaption={aboutPhotoCaption}
              photoYear={aboutPhotoYear}
              linkText={aboutLinkText}
            />

            {/* ── Recent history ── */}
            <RecentHistorySection
              heading={t("historicalIntroHeading")}
              articles={recentHistoryArticles}
              emptyLabel={t("noHistoryPages")}
              viewAllHref="/history"
              viewAllLabel={t("viewAllHistory")}
            />

            {/* ── Chapters ── */}
            <ChaptersSection heading={t("chaptersHeading")} chapters={chapters} visitLabel={t("visit")} />

            {/* ── Membership ── */}
            <MembershipSection heading={membershipHeading} paragraphs={membershipParagraphs} ctaText={membershipCtaText} />

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
