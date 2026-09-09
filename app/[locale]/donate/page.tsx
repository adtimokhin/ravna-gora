import { getTranslations } from "next-intl/server";
import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { CatalogHeader } from "../../components/ui/CatalogHeader";
import { DonateForm } from "../../components/ui/DonateForm";

// Reuses the membership hero — donations sit alongside membership as the two
// ways to support the Movement.
const A = {
  hero: "/images/about-us-section-original/1512.avif",
};

export default async function DonatePage() {
  const t = await getTranslations("membership");

  return (
    <div className="min-h-screen bg-offwhite-1 flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-[1512px] mx-auto px-4 md:px-6 xl:px-10 pt-(--space-8) pb-(--space-10) flex flex-col gap-(--space-8)">
          <CatalogHeader
            imageSrc={A.hero}
            imageAlt={t("donationTitle")}
            title={t("donationTitle")}
            description={t("donationDescription")}
          />

          <DonateForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
