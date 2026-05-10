import { transformerMetaHighlight, transformerRemoveLineBreak } from "@shikijs/transformers";
import { codeToHtml } from "shiki";
import { escapeHtml } from "./util.ts";

export function isCodeFenceStart(line: string) {
  return line.startsWith("```");
}

function parseCodeFenceInfo(info: string) {
  const language = info.match(/^([^\s:{]+)/)?.[1] ?? "text";
  const highlight = info.match(/\{[\d,-]+\}/)?.[0] ?? "";
  const lineNumbers = /(^|:)line-numbers\b/.test(info);

  return {
    language,
    lineNumbers,
    meta: highlight,
  };
}

function fallbackCodeBlock(code: string, language: string) {
  const languageClass = language ? ` class="language-${escapeHtml(language)}"` : "";
  const languageDisplay = language === "text" ? "" : language;
  const headerHtml = languageDisplay
    ? `<div class="code-header"><span class="language">${escapeHtml(languageDisplay)}</span><button class="copy-btn" data-code="${escapeHtml(code)}">Copy</button></div>`
    : `<div class="code-header"><button class="copy-btn" data-code="${escapeHtml(code)}">Copy</button></div>`;

  return `<div class="code-block">${headerHtml}<pre><code${languageClass}>${escapeHtml(code)}</code></pre></div>`;
}

export async function renderCodeBlock(code: string, info: string) {
  const { language, lineNumbers, meta } = parseCodeFenceInfo(info);

  try {
    const html = await codeToHtml(code, {
      lang: language,
      meta: { __raw: meta },
      defaultColor: "light-dark()",
      themes: {
        dark: "monokai",
        light: "horizon-bright",
      },
      transformers: [
        transformerMetaHighlight(),
        transformerRemoveLineBreak(),
        {
          pre(node) {
            this.addClassToHast(node, "vp-code");

            if (lineNumbers) {
              this.addClassToHast(node, "line-numbers");
            }
          },
          code(node) {
            this.addClassToHast(node, `language-${language}`);
          },
          line(node, lineNumber) {
            node.properties["data-line"] = String(lineNumber);
          },
        },
      ],
    });

    const languageDisplay = language === "text" ? "" : language;
    const headerHtml = languageDisplay
      ? `<div class="code-header"><span class="language">${escapeHtml(languageDisplay)}</span><button class="copy-btn" data-code="${escapeHtml(code)}">Copy</button></div>`
      : `<div class="code-header"><button class="copy-btn" data-code="${escapeHtml(code)}">Copy</button></div>`;

    return `<div class="code-block">${headerHtml}${html}</div>`;
  } catch {
    return fallbackCodeBlock(code, language);
  }
}

export async function renderCodeFence(lines: string[], index: number) {
  const fence = lines[index]?.match(/^```(.*)$/);
  const code: string[] = [];

  index += 1;
  while (index < lines.length && !isCodeFenceStart(lines[index] ?? "")) {
    code.push(lines[index] ?? "");
    index += 1;
  }

  return {
    html: await renderCodeBlock(code.join("\n"), fence?.[1] ?? ""),
    index,
  };
}
