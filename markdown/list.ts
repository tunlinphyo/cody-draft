import { renderInlineMarkdown } from "./code.ts";

export function isListStart(line: string) {
  return /^-\s+/.test(line);
}

export function renderList(lines: string[], index: number) {
  const items: string[] = [];

  while (index < lines.length && isListStart(lines[index] ?? "")) {
    items.push(`<li>${renderInlineMarkdown((lines[index] ?? "").replace(/^-\s+/, ""))}</li>`);
    index += 1;
  }

  return {
    html: `<ul>${items.join("")}</ul>`,
    index: index - 1,
  };
}
