const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in",
  "nor", "of", "on", "or", "per", "the", "to", "vs", "via",
]);

export function toTitleCase(input: string): string {
  const words = input.trim().split(/\s+/);
  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i !== 0 && i !== words.length - 1 && MINOR_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
