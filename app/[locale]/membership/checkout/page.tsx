import { CheckoutForm } from "../../../components/ui/CheckoutForm";

type Plan = "supporting" | "full";
type Edition = "digital" | "print" | "both";

export default async function MembershipCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; edition?: string }>;
}) {
  const params = await searchParams;

  const plan: Plan | null =
    params.plan === "supporting" || params.plan === "full" ? params.plan : null;
  const edition: Edition | null =
    plan === "supporting" &&
    (params.edition === "digital" || params.edition === "print" || params.edition === "both")
      ? (params.edition as Edition)
      : null;

  return (
    <div className="min-h-screen bg-offwhite-1">
      <div className="max-w-[1512px] mx-auto px-4 md:px-6 xl:px-10 pt-(--space-8) pb-(--space-10)">
        <CheckoutForm plan={plan} edition={edition} />
      </div>
    </div>
  );
}
