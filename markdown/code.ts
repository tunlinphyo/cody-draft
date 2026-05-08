import { escapeHtml } from "./util.ts";

export function renderInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
      const externalAttributes = /^(?:https?:)?\/\//.test(href)
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";

      return `<a href="${href}"${externalAttributes}>${label}</a>`;
    });
}
