import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import type { Plugin, UserConfig } from "vite";
import { parseContainerStart, renderContainer } from "./container.ts";
import { isCodeFenceStart, renderCodeFence } from "./codeblock.ts";
import { isHeadingStart, renderHeading } from "./heading.ts";
import { isHtmlBlockStart, renderHtmlBlock } from "./html.ts";
import { isListStart, renderList } from "./list.ts";
import { renderParagraph } from "./paragraph.ts";
import { escapeHtml, isIgnoredMarkdownFile, titleFromMarkdown } from "./util.ts";

const rootDir = process.cwd();
const contentDir = join(rootDir, "src");
const templatePath = join(rootDir, "markdown", "template.html");
const ignoredDirs = new Set(["node_modules", ".git", "dist", "build", ".vite"]);

function isIgnoredPath(path: string) {
  return path.split(sep).some((part) => ignoredDirs.has(part));
}

function isParagraphBoundary(line: string) {
  return (
    isHeadingStart(line) ||
    isCodeFenceStart(line) ||
    Boolean(parseContainerStart(line)) ||
    /^---+$/.test(line.trim()) ||
    isListStart(line) ||
    isHtmlBlockStart(line)
  );
}

async function renderMarkdown(markdown: string) {
  const blocks: string[] = [];
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    if (!line.trim()) {
      continue;
    }

    if (isCodeFenceStart(line)) {
      const codeFence = await renderCodeFence(lines, index);
      blocks.push(codeFence.html);
      index = codeFence.index;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push("<hr>");
      continue;
    }

    const container = parseContainerStart(line);
    if (container) {
      const renderedContainer = await renderContainer(lines, index, renderMarkdown);
      blocks.push(renderedContainer.html);
      index = renderedContainer.index;
      continue;
    }

    if (isHtmlBlockStart(line)) {
      const htmlBlock = renderHtmlBlock(lines, index);
      blocks.push(htmlBlock.html);
      index = htmlBlock.index;
      continue;
    }

    const heading = renderHeading(line);
    if (heading) {
      blocks.push(heading);
      continue;
    }

    if (isListStart(line)) {
      const list = renderList(lines, index);
      blocks.push(list.html);
      index = list.index;
      continue;
    }

    const paragraph = renderParagraph(lines, index, isParagraphBoundary);
    blocks.push(paragraph.html);
    index = paragraph.index;
  }

  return blocks.join("\n");
}

async function createPage(markdownPath: string) {
  const markdown = readFileSync(markdownPath, "utf8");
  const template = readFileSync(templatePath, "utf8");
  const slug = basename(markdownPath, extname(markdownPath));
  const title = titleFromMarkdown(markdown, slug);
  const content = await renderMarkdown(markdown);

  return template.replaceAll("{{title}}", escapeHtml(title)).replaceAll("{{content}}", content);
}

function htmlPathForMarkdown(markdownPath: string) {
  const slug = basename(markdownPath, extname(markdownPath));
  const markdownDir = dirname(markdownPath);
  const relativeMarkdownDir = relative(contentDir, markdownDir);

  if (!relativeMarkdownDir.startsWith("..") && relativeMarkdownDir !== "") {
    return join(rootDir, relativeMarkdownDir, slug, "index.html");
  }

  if (markdownDir === contentDir) {
    return join(rootDir, slug, "index.html");
  }

  return join(markdownDir, slug, "index.html");
}

function discoverMarkdownFiles(dir = rootDir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return isIgnoredPath(relative(rootDir, path)) ? [] : discoverMarkdownFiles(path);
    }

    return entry.isFile() && extname(entry.name) === ".md" && !isIgnoredMarkdownFile(path)
      ? [path]
      : [];
  });
}

async function writeMarkdownPage(markdownPath: string) {
  if (isIgnoredPath(relative(rootDir, markdownPath)) || isIgnoredMarkdownFile(markdownPath)) {
    return undefined;
  }

  const htmlPath = htmlPathForMarkdown(markdownPath);
  const html = await createPage(markdownPath);

  mkdirSync(dirname(htmlPath), { recursive: true });

  if (!existsSync(htmlPath) || readFileSync(htmlPath, "utf8") !== html) {
    writeFileSync(htmlPath, html);
  }

  return htmlPath;
}

async function writeMarkdownPages() {
  const htmlPages = await Promise.all(discoverMarkdownFiles().map(writeMarkdownPage));

  return htmlPages.filter((path) => path !== undefined);
}

export function markdownPagesPlugin(): Plugin {
  return {
    name: "markdown-pages",
    async config() {
      const htmlPages = await writeMarkdownPages();
      const input = Object.fromEntries([
        ["app", resolve(rootDir, "index.html")],
        ...htmlPages.map((path) => [relative(rootDir, dirname(path)).replaceAll(sep, "-"), path]),
      ]);

      return {
        build: {
          rollupOptions: {
            input,
          },
        },
      } satisfies UserConfig;
    },
    configureServer(server) {
      server.watcher.add(templatePath);

      server.watcher.on("change", (path) => {
        if (path === templatePath) {
          void writeMarkdownPages();
        }
      });

      const sync = async (path: string) => {
        if (extname(path) !== ".md") {
          return;
        }

        const htmlPath = await writeMarkdownPage(path);
        if (htmlPath) {
          server.watcher.add(htmlPath);
        }
      };

      server.watcher.on("add", sync);
      server.watcher.on("change", sync);
      server.watcher.on("unlink", (path) => {
        if (extname(path) !== ".md") {
          return;
        }

        const htmlDir = dirname(htmlPathForMarkdown(path));

        if (existsSync(htmlDir)) {
          rmSync(htmlDir, { recursive: true, force: true });
        }
      });
    },
  };
}
