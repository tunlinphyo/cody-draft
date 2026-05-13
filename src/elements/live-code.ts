import * as ace from "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-tomorrow_night_eighties";
import { html, LitElement, unsafeCSS } from "lit";
import liveCodeCss from "./styles/live-code.css?raw";
import utilsCss from "./styles/utils.css?raw";

type LiveCodeLanguage = "html" | "css" | "js";

const languages: LiveCodeLanguage[] = ["html", "css", "js"];
const languageLabels: Record<LiveCodeLanguage, string> = {
  html: "HTML",
  css: "CSS",
  js: "JS",
};
const editorModes: Record<LiveCodeLanguage, string> = {
  html: "html",
  css: "css",
  js: "javascript",
};
const emptyCode: Record<LiveCodeLanguage, string> = { html: "", css: "", js: "" };
const aceTheme = ace.require("ace/theme/tomorrow_night_eighties") as { cssText?: string };

export class LiveCode extends LitElement {
  static properties = {
    cssFile: { attribute: "css-file", type: String },
    height: { type: String },
    htmlFile: { attribute: "html-file", type: String },
    jsFile: { attribute: "js-file", type: String },
    title: { type: String },
  };

  static styles = unsafeCSS(`${utilsCss}\n${liveCodeCss}\n${aceTheme.cssText ?? ""}`);

  #activeLanguage: LiveCodeLanguage = "html";
  #code: Record<LiveCodeLanguage, string> = { ...emptyCode };
  #editor?: ace.Ace.Editor;
  #editorElement?: HTMLDivElement;
  #initialCodeKey?: string;
  #preview?: HTMLIFrameElement;
  #previewTimer = 0;

  declare cssFile: string;
  declare height: string;
  declare htmlFile: string;
  declare jsFile: string;
  declare title: string;

  connectedCallback() {
    super.connectedCallback();
    void this.#loadInitialCode();
  }

  firstUpdated() {
    this.#editorElement = this.renderRoot.querySelector('[part="editor"]') ?? undefined;
    this.#preview = this.renderRoot.querySelector('[part="preview"]') ?? undefined;
    this.#setupEditor();
    this.#updatePreview();
  }

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (
      changedProperties.has("htmlFile") ||
      changedProperties.has("cssFile") ||
      changedProperties.has("jsFile")
    ) {
      void this.#loadInitialCode();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.clearTimeout(this.#previewTimer);
    this.#editor?.destroy();
    this.#editor = undefined;
  }

  render() {
    return html`
      <section part="root" style=${this.height ? `--live-code-height: ${this.height}` : ""}>
        <header part="header">
          <div part="title">${this.title || "Code Playground"}</div>
          <div part="header-actions">
            <button
              type="button"
              part="icon-button"
              @click=${() => this.#showEditor()}
              aria-label="Show editor"
              title="Show editor"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 20h9"></path>
                <path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5Z"></path>
              </svg>
            </button>
            <button
              type="button"
              part="icon-button"
              @click=${() => this.#toggleEditor()}
              aria-label="Toggle editor"
              title="Toggle editor"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M19 20V4"></path>
                <path d="m14 7-5 5 5 5"></path>
                <path d="M5 5v14"></path>
              </svg>
            </button>
          </div>
        </header>
        <div part="body">
          <section part="editor-panel">
            <div part="tabs" role="tablist" aria-label="Code language">
              ${this.#visibleLanguages.map(
                (language) => html`
                  <button
                    type="button"
                    part="tab"
                    id=${`${language}-tab`}
                    role="tab"
                    aria-selected=${String(language === this.#activeLanguage)}
                    @click=${() => this.#selectLanguage(language)}
                  >
                    ${languageLabels[language]}
                  </button>
                `,
              )}
            </div>
            <div part="editor"></div>
          </section>
          <section part="preview-panel">
            <header part="preview-header">
              <div part="preview-title">RESULT</div>
              <div part="preview-actions">
                <button
                  type="button"
                  part="icon-button"
                  @click=${() => this.#updatePreview()}
                  aria-label="Refresh preview"
                  title="Refresh preview"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M21 12a9 9 0 0 1-15.5 6.2"></path>
                    <path d="M3 12A9 9 0 0 1 18.5 5.8"></path>
                    <path d="M18 2v4h4"></path>
                    <path d="M6 22v-4H2"></path>
                  </svg>
                </button>
              </div>
            </header>
            <div part="preview-wrap">
              <iframe part="preview" title="Live code result"></iframe>
            </div>
          </section>
        </div>
      </section>
    `;
  }

  #setupEditor() {
    if (!this.#editorElement) {
      return;
    }

    const editor = ace.edit(this.#editorElement, {
      fontSize: "1rem",
      highlightActiveLine: false,
      maxLines: Infinity,
      minLines: 14,
      showGutter: false,
      showPrintMargin: false,
      tabSize: 2,
      theme: "ace/theme/tomorrow_night_eighties",
      useWorker: false,
      wrap: true,
    });
    this.#editor = editor;
    editor.renderer.attachToShadowRoot();
    editor.renderer.setScrollMargin(8, 16, 0, 0);
    editor.renderer.setPadding(24);
    editor.session.setUseWorker(false);
    editor.session.on("change", () => this.#handleEditorChange());
    this.#syncEditorSession();
  }

  #selectLanguage(language: LiveCodeLanguage) {
    if (language === this.#activeLanguage || !this.#visibleLanguages.includes(language)) {
      return;
    }

    this.#saveActiveCode();
    this.#activeLanguage = language;
    this.#syncEditorSession();
    this.requestUpdate();
    this.#editor?.focus();
  }

  #syncEditorSession() {
    if (!this.#editor) {
      return;
    }

    this.#editor.session.setMode(`ace/mode/${editorModes[this.#activeLanguage]}`);
    this.#editor.setValue(this.#code[this.#activeLanguage], -1);
  }

  #handleEditorChange() {
    this.#saveActiveCode();
    window.clearTimeout(this.#previewTimer);
    this.#previewTimer = window.setTimeout(() => this.#updatePreview(), 180);
  }

  #saveActiveCode() {
    const value = this.#editor?.getValue();

    if (value !== undefined) {
      this.#code[this.#activeLanguage] = value;
    }
  }

  #updatePreview() {
    this.#saveActiveCode();

    if (!this.#preview) {
      return;
    }

    this.#preview.srcdoc = this.#buildPreviewDocument();
  }

  #buildPreviewDocument() {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>${this.#code.css}</style>
  </head>
  <body>${this.#code.html}</body>
  <script>${this.#code.js.replaceAll("</script", "<\\/script")}</script>
</html>`;
  }

  #showEditor() {
    this.toggleAttribute("data-preview-only", false);
    this.#editor?.resize();
    this.#editor?.focus();
  }

  #toggleEditor() {
    this.toggleAttribute("data-preview-only");
    this.#editor?.resize();
  }

  async #loadInitialCode() {
    const key = `${this.htmlFile ?? ""}\n${this.cssFile ?? ""}\n${this.jsFile ?? ""}`;

    if (key === this.#initialCodeKey) {
      return;
    }

    this.#initialCodeKey = key;
    this.#activeLanguage = this.#visibleLanguages.includes(this.#activeLanguage)
      ? this.#activeLanguage
      : "html";
    this.#code = { ...emptyCode, ...this.#readTemplateCode(), ...(await this.#readFileCode()) };
    this.#syncEditorSession();
    this.#updatePreview();
  }

  get #visibleLanguages() {
    return languages.filter((language) => language === "html" || this[`${language}File`]);
  }

  #readTemplateCode() {
    const code: Partial<Record<LiveCodeLanguage, string>> = {};

    for (const language of languages) {
      const source = this.querySelector<HTMLTemplateElement>(`template[data-lang="${language}"]`);

      if (source) {
        code[language] = source.innerHTML.trim();
      }
    }

    return code;
  }

  async #readFileCode() {
    const entries: [LiveCodeLanguage, string | undefined][] = [
      ["html", this.htmlFile],
      ["css", this.cssFile],
      ["js", this.jsFile],
    ];
    const code: Partial<Record<LiveCodeLanguage, string>> = {};

    await Promise.all(
      entries.map(async ([language, file]) => {
        if (file) {
          code[language] = await this.#fetchCode(file);
        }
      }),
    );

    return code;
  }

  async #fetchCode(file: string) {
    try {
      const response = await fetch(file);

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.warn(`Unable to load live-code source: ${file}`, error);
      return "";
    }
  }
}

if (!customElements.get("live-code")) {
  customElements.define("live-code", LiveCode);
}
