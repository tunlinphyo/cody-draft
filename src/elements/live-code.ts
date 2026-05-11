import * as ace from "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/theme-tomorrow_night_eighties";
import liveCodeCss from "./styles/live-code.css?raw";
import utilsCss from "./styles/utils.css?raw";

type LiveCodeLanguage = "html" | "css" | "js";

const languages: LiveCodeLanguage[] = ["html", "css", "js"];
const languageLabels: Record<LiveCodeLanguage, string> = {
  html: "HTML",
  css: "CSS",
  js: "JS",
};
const defaultCode: Record<LiveCodeLanguage, string> = {
  html: `<ul class="row">
  <li class="item"></li>
  <li class="raised item"></li>
  <li class="item"></li>
</ul>`,
  css: `.row {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  width: 56px;
  height: 56px;
  border: 3px solid #111;
  border-radius: 6px;
  background: white;
}

.raised.item {
  z-index: 2;
  background: hotpink;
}`,
  js: ``,
};
const aceTheme = ace.require("ace/theme/tomorrow_night_eighties") as { cssText?: string };
const shadowStyle = new CSSStyleSheet();
shadowStyle.replaceSync(`${utilsCss}\n${liveCodeCss}\n${aceTheme.cssText ?? ""}`);
const template = document.createElement("template");
template.innerHTML = `
  <section part="root">
    <header part="header">
      <div part="title">Code Playground</div>
      <div part="header-actions">
        <button type="button" part="icon-button" data-action="edit" aria-label="Show editor" title="Show editor">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 20h9"></path>
            <path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5Z"></path>
          </svg>
        </button>
        <button type="button" part="icon-button" data-action="toggle-preview" aria-label="Toggle editor" title="Toggle editor">
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
        <div part="tabs" role="tablist" aria-label="Code language"></div>
        <div part="editor"></div>
      </section>
      <section part="preview-panel">
        <header part="preview-header">
          <div part="preview-title">RESULT</div>
          <div part="preview-actions">
            <button type="button" part="icon-button" data-action="refresh" aria-label="Refresh preview" title="Refresh preview">
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

export class LiveCode extends HTMLElement {
  static observedAttributes = ["height", "title"];

  readonly #root = this.attachShadow({ mode: "open" });
  #activeLanguage: LiveCodeLanguage = "html";
  #code: Record<LiveCodeLanguage, string> = { ...defaultCode };
  #editor?: ace.Ace.Editor;
  #editorElement?: HTMLDivElement;
  #preview?: HTMLIFrameElement;
  #previewTimer = 0;
  #tabs?: HTMLDivElement;

  constructor() {
    super();
    this.#root.adoptedStyleSheets = [shadowStyle];
  }

  connectedCallback() {
    if (!this.#root.hasChildNodes()) {
      this.#readInitialCode();
      this.#render();
    }

    this.#syncAttributes();
    this.#updatePreview();
  }

  disconnectedCallback() {
    window.clearTimeout(this.#previewTimer);
    this.#editor?.destroy();
    this.#editor = undefined;
  }

  attributeChangedCallback() {
    if (this.#root.hasChildNodes()) {
      this.#syncAttributes();
    }
  }

  #render() {
    this.#root.replaceChildren(template.content.cloneNode(true));

    this.#editorElement = this.#root.querySelector('[part="editor"]') ?? undefined;
    this.#preview = this.#root.querySelector('[part="preview"]') ?? undefined;
    this.#tabs = this.#root.querySelector('[part="tabs"]') ?? undefined;

    this.#root
      .querySelector('[data-action="refresh"]')
      ?.addEventListener("click", () => this.#updatePreview());
    this.#root
      .querySelector('[data-action="edit"]')
      ?.addEventListener("click", () => this.#showEditor());
    this.#root
      .querySelector('[data-action="toggle-preview"]')
      ?.addEventListener("click", () => this.#toggleEditor());

    this.#renderTabs();
    this.#setupEditor();
  }

  #renderTabs() {
    this.#tabs?.replaceChildren(
      ...languages.map((language) => {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.part.add("tab");
        tab.id = `${language}-tab`;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(language === this.#activeLanguage));
        tab.textContent = languageLabels[language];
        tab.addEventListener("click", () => this.#selectLanguage(language));
        return tab;
      }),
    );
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
    if (language === this.#activeLanguage) {
      return;
    }

    this.#saveActiveCode();
    this.#activeLanguage = language;
    this.#syncEditorSession();
    this.#renderTabs();
    this.#editor?.focus();
  }

  #syncEditorSession() {
    if (!this.#editor) {
      return;
    }

    this.#editor.session.setMode(`ace/mode/${this.#activeLanguage}`);
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

    this.#preview.srcdoc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>${this.#code.css}</style>
  </head>
  <body>${this.#code.html}</body>
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

  #syncAttributes() {
    const title = this.getAttribute("title");
    const height = this.getAttribute("height");
    const titleElement = this.#root.querySelector('[part="title"]');
    const root = this.#root.querySelector<HTMLElement>('[part="root"]');

    if (titleElement) {
      titleElement.textContent = title || "Code Playground";
    }

    if (root && height) {
      root.style.setProperty("--live-code-height", height);
    }
  }

  #readInitialCode() {
    for (const language of languages) {
      const source = this.querySelector<HTMLTemplateElement>(`template[data-lang="${language}"]`);

      if (source) {
        this.#code[language] = source.innerHTML.trim();
      }
    }
  }
}

if (!customElements.get("live-code")) {
  customElements.define("live-code", LiveCode);
}
