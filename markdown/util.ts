import { basename } from "node:path";

const ignoredMarkdownFiles = new Set(["AGENTS.md", "README.md"]);

export function isIgnoredMarkdownFile(path: string) {
  return ignoredMarkdownFiles.has(basename(path));
}

export function stripInlineMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

export function titleFromMarkdown(markdown: string, fallback: string) {
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading ? stripInlineMarkdown(heading) : fallback;
}

export function slugFromHeading(value: string) {
  return stripInlineMarkdown(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
