import { SectionHeading } from "./SectionHeading";

type Chapter = { name: string; websiteUrl?: string };

export function ChaptersSection({
  heading,
  chapters,
  visitLabel,
}: {
  heading: string;
  chapters: Chapter[];
  visitLabel: string;
}) {
  return (
    <section className="flex flex-col gap-[var(--space-text-tp)]">
      <SectionHeading title={heading} />

      <div className="flex justify-center">
        <div className="w-full max-w-[949px] flex flex-col gap-[var(--space-4)]">
          {chapters.map(({ name, websiteUrl }) => (
            <div key={name} className="flex flex-col gap-[var(--space-4)]">
              <div className="h-px bg-black/20 w-full" />
              {websiteUrl ? (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between group">
                  <p className="type-h2 text-black">{name}</p>
                  <span className="type-body text-black group-hover:underline">{visitLabel} →</span>
                </a>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="type-h2 text-black">{name}</p>
                </div>
              )}
            </div>
          ))}
          <div className="h-px bg-black/20 w-full" />
        </div>
      </div>
    </section>
  );
}
