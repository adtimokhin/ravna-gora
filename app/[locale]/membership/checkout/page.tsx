import { Navbar } from "../../../components/layout/Navbar";
import { Footer } from "../../../components/layout/Footer";
import { CheckoutForm } from "../../../components/ui/CheckoutForm";

type Plan = "supporting" | "full";
type Edition = "digital" | "print" | "both";

export default async function MembershipCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; edition?: string; donation?: string }>;
}) {
  const params = await searchParams;

  const plan: Plan | null =
    params.plan === "supporting" || params.plan === "full" ? params.plan : null;
  const edition: Edition | null =
    plan === "supporting" &&
    (params.edition === "digital" || params.edition === "print" || params.edition === "both")
      ? (params.edition as Edition)
      : null;
  const donationCents = Math.max(0, Number.parseInt(params.donation ?? "0", 10) || 0);

  return (
    <div className="min-h-screen bg-offwhite-1 flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-[1512px] mx-auto px-4 md:px-6 xl:px-10 pt-(--space-8) pb-(--space-10)">
          <CheckoutForm plan={plan} edition={edition} donationCents={donationCents} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
