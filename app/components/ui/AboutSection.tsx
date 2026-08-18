import Image from "next/image";
import { Link } from "../../../i18n/navigation";
import { SectionHeading } from "./SectionHeading";

export function AboutSection({
  heading,
  paragraphs,
  pictureUrl,
  photoCaption,
  photoYear,
  linkText,
}: {
  heading: string;
  paragraphs: string[];
  pictureUrl: string;
  photoCaption?: string;
  photoYear?: string;
  linkText: string;
}) {
  return (
    <section className="flex flex-col xl:flex-row items-start justify-between gap-[var(--space-10)] xl:gap-[73px]">
      <div className="flex flex-col gap-[var(--space-big)] w-full xl:w-[586px] shrink-0">
        <div className="flex flex-col gap-[var(--space-text-tp)]">
          <SectionHeading title={heading} />

          <div className="flex flex-col gap-[var(--space-text-p)]">
            {paragraphs.map((paragraph, i) => (
              <p key={i} className="type-body text-black">{paragraph}</p>
            ))}
          </div>
        </div>

        <Link href="/about" className="type-h4 text-black text-center xl:text-left hover:underline">{linkText}</Link>
      </div>

      <div className="flex flex-col gap-[10px] w-full xl:w-[716px] p-[10px]">
        <div className="relative h-[280px] md:h-[380px] xl:h-[489px] w-full">
          <Image
            alt={photoCaption || heading}
            src={pictureUrl}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 640px, (max-width: 1280px) 1024px, 716px"
          />
        </div>
        {(photoCaption || photoYear) && (
          <div className="flex flex-col">
            {photoCaption && <p className="type-body text-black">{photoCaption}</p>}
            {photoYear && <p className="type-caption text-gray-2">{photoYear}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
