import { Link } from "../../../../i18n/navigation";
import { PaneTitle } from "./shared";

export function BillingPane({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex flex-col gap-8">
      <PaneTitle>{t("billing")}</PaneTitle>

      <div className="border border-black/15 p-6 flex flex-col gap-4 max-w-md">
        <p className="type-micro-serif text-gray-2">{t("currentPlan")}</p>
        <p className="type-h4 text-black">Full Member</p>
        <p className="type-body-serif text-gray-2">{t("renewsOn")} January 1, 2027</p>
        <Link
          href="/membership"
          className="type-ui-serif text-blue-2 hover:underline self-start"
        >
          {t("managePlan")} →
        </Link>
      </div>
    </div>
  );
}
