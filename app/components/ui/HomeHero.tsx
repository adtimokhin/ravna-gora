import Image from "next/image";

export function HomeHero({
  title,
  subtitle,
  pictureUrl,
}: {
  title: string;
  subtitle: string;
  pictureUrl: string;
}) {
  return (
    <section className="flex flex-col gap-[var(--space-9)]">
      <div className="flex flex-col gap-[var(--space-title-sub)] items-center text-center text-black">
        <h1 className="type-display">{title}</h1>
        <p className="type-h2">{subtitle}</p>
      </div>

      <div className="w-full h-[220px] md:h-[360px] xl:h-[507px] overflow-hidden relative">
        <Image
          alt={title}
          src={pictureUrl}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 640px, (max-width: 1280px) 1024px, 1512px"
        />
      </div>
    </section>
  );
}
