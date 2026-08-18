import { Link } from "../../../i18n/navigation";
import { SectionHeading } from "./SectionHeading";

export function MembershipSection({
  heading,
  paragraphs,
  ctaText,
}: {
  heading: string;
  paragraphs: string[];
  ctaText: string;
}) {
  return (
    <section className="pb-[var(--space-8)]">
      <div className="flex flex-col xl:flex-row items-start xl:items-center gap-[var(--space-10)] xl:gap-[141px]">
        <div className="flex flex-col gap-[var(--space-text-tp)] w-full xl:w-[706px]">
          <SectionHeading title={heading} />

          <div className="flex flex-col gap-[var(--space-text-p)]">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="type-body text-black">{paragraph}</p>
            ))}
          </div>
        </div>

        <Link
          href="/membership"
          className="bg-blue-2 text-white type-h4 text-center w-full xl:w-[464px] py-[26px] px-5 flex items-center justify-center shrink-0"
        >
          {ctaText}
        </Link>
      </div>
    </section>
  );
}
