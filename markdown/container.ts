import { renderInlineMarkdown } from "./code.ts";

const containerTypes = new Set(["info", "tip", "warning", "danger", "details"]);

export type MarkdownRenderer = (markdown: string) => Promise<string>;

export function parseContainerStart(line: string) {
  const match = line.trim().match(/^:::\s*(\w+)(?:\s+(.+))?$/);

  if (!match || !containerTypes.has(match[1] ?? "")) {
    return undefined;
  }

  return {
    title: match[2]?.trim(),
    type: match[1] ?? "",
  };
}

function defaultContainerTitle(type: string) {
  return type === "details" ? "Details" : `${type.slice(0, 1).toUpperCase()}${type.slice(1)}`;
}

async function renderContainerBlock(
  type: string,
  title: string | undefined,
  markdown: string,
  renderMarkdown: MarkdownRenderer,
) {
  const renderedContent = await renderMarkdown(markdown);
  const renderedTitle = renderInlineMarkdown(title || defaultContainerTitle(type));

  if (type === "details") {
    return `<details class="markdown-card markdown-card--details"><summary>${renderedTitle}</summary>\n${renderedContent}\n</details>`;
  }

  return `<aside class="markdown-card markdown-card--${type}"><p class="markdown-card__title">${renderedTitle}</p>\n${renderedContent}\n</aside>`;
}

export async function renderContainer(
  lines: string[],
  index: number,
  renderMarkdown: MarkdownRenderer,
) {
  const container = parseContainerStart(lines[index] ?? "");
  const content: string[] = [];

  index += 1;
  while (index < lines.length && (lines[index] ?? "").trim() !== ":::") {
    content.push(lines[index] ?? "");
    index += 1;
  }

  return {
    html: await renderContainerBlock(
      container?.type ?? "",
      container?.title,
      content.join("\n"),
      renderMarkdown,
    ),
    index,
  };
}
