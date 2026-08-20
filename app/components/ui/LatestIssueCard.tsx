import Image from "next/image";
import { Link } from "../../../i18n/navigation";

export function LatestIssueCard({
  date,
  heading,
  description,
  pictureUrl,
  imageAlt,
}: {
  date: string;
  heading: string;
  description: string;
  pictureUrl: string;
  imageAlt: string;
}) {
  return (
    <div className="flex justify-center">
      <Link href="/newspaper-catalog" className="group flex flex-col gap-(--space-3) w-full max-w-116">
        <div className="relative h-[300px] md:h-[360px] xl:h-[420px] overflow-hidden">
          <Image
            alt={imageAlt}
            src={pictureUrl}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 464px"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="flex flex-col gap-[var(--space-3)]">
          <div className="flex flex-col gap-[4px]">
            <p className="type-large text-black">{date}</p>
            <h3 className="type-h3 text-black group-hover:underline">{heading}</h3>
          </div>

          <p className="type-body text-black">{description}</p>
        </div>
      </Link>
    </div>
  );
}
