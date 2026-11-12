export interface SearchEntry {
  title: string;
  section: string;
  group: string;
  url: string;
  text: string;
}
export interface SearchResult extends SearchEntry {
  score: number;
  excerpt: string;
}
export function search(entries: SearchEntry[], query: string): SearchResult[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return entries
    .flatMap((entry) => {
      const title = entry.title.toLowerCase();
      const text = entry.text.toLowerCase();
      if (!terms.every((term) => `${title} ${text}`.includes(term))) return [];
      const score = terms.reduce(
        (total, term) =>
          total +
          (title === term ? 100 : title.includes(term) ? 30 : 0) +
          (text.includes(term) ? 1 : 0),
        0,
      );
      const position = Math.max(0, text.indexOf(terms[0]) - 50);
      return [
        {
          ...entry,
          score,
          excerpt:
            (position ? '…' : '') +
            entry.text.slice(position, position + 140) +
            (entry.text.length > position + 140 ? '…' : ''),
        },
      ];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 16);
}
