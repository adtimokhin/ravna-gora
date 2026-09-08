import { getTranslations } from "next-intl/server";
import { Navbar } from "../../../components/layout/Navbar";
import { Footer } from "../../../components/layout/Footer";
import { Link } from "../../../../i18n/navigation";

export default async function MembershipSuccessPage({
  searchParams,
}: {
  // `session_id` is the Stripe Checkout Session id, substituted into
  // MEMBERSHIP_SUCCESS_URL by the Worker. Accepted but not read — the
  // membership row is written asynchronously by the Worker's Stripe webhook.
  searchParams: Promise<{ session_id?: string }>;
}) {
  await searchParams;
  const t = await getTranslations("membership");

  return (
    <div className="min-h-screen bg-offwhite-1 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="flex flex-col items-center text-center gap-4 max-w-md py-(--space-10)">
          <h1 className="type-h1 text-black">{t("successTitle")}</h1>
          <p className="type-body text-gray-2">{t("successDesc")}</p>
          <Link href="/account" className="type-ui-medium text-blue-2 hover:underline">
            {t("successCta")}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
