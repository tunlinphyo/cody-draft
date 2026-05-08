import { renderInlineMarkdown } from "./code.ts";
import { slugFromHeading } from "./util.ts";

export function isHeadingStart(line: string) {
  return /^(#{1,6})\s+/.test(line);
}

export function renderHeading(line: string) {
  const heading = line.match(/^(#{1,6})\s+(.+)$/);

  if (!heading) {
    return undefined;
  }

  const level = heading[1].length;
  const id = level === 2 ? ` id="${slugFromHeading(heading[2])}"` : "";

  return `<h${level}${id}>${renderInlineMarkdown(heading[2])}</h${level}>`;
}
