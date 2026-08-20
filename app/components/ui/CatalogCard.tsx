import { Link } from "../../../i18n/navigation";
import { toTitleCase } from "../../../lib/titleCase";

export function CatalogCard({
  title,
  subtitle,
  pictureUrl,
  href,
}: {
  title: string;
  subtitle?: string;
  pictureUrl: string;
  href?: string;
}) {
  const inner = (
    <article className="flex flex-col gap-[10px]">
      <div className="relative w-full h-[300px] md:h-[516px] overflow-hidden">
        <img
          alt={title}
          src={pictureUrl}
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-1">
        {subtitle && <p className="type-large text-black">{subtitle}</p>}
        <p className="type-h3 text-black group-hover:underline">{toTitleCase(title)}</p>
      </div>
    </article>
  );

  return href ? <Link href={href} className="group">{inner}</Link> : inner;
}