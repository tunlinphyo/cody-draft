import { renderInlineMarkdown } from "./code.ts";

export type BoundaryMatcher = (line: string) => boolean;

export function renderParagraph(lines: string[], index: number, isBoundary: BoundaryMatcher) {
  const paragraph = [(lines[index] ?? "").trim()];

  while (
    index + 1 < lines.length &&
    (lines[index + 1] ?? "").trim() &&
    !isBoundary(lines[index + 1] ?? "")
  ) {
    index += 1;
    paragraph.push((lines[index] ?? "").trim());
  }

  return {
    html: `<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`,
    index,
  };
}
