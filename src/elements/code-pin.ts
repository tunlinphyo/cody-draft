import { LitElement, html, css, nothing } from "lit";

type EditorTab = "html" | "css" | "js";

export class CodePen extends LitElement {
  static properties = {
    htmlCode: { type: String, attribute: "html-code" },
    cssCode: { type: String, attribute: "css-code" },
    jsCode: { type: String, attribute: "js-code" },
    autorun: { type: Boolean },
    activeTab: { state: true },
    previewDocument: { state: true },
  };

  htmlCode = `<h1>Hello CodePen</h1>
<p>Edit the code and see the preview.</p>
<button>Click me</button>`;

  cssCode = `body {
  font-family: system-ui, sans-serif;
  padding: 2rem;
  background: #f6f6f6;
  color: #111;
}

h1 {
  color: royalblue;
}

button {
  padding: 0.75rem 1rem;
  border: 0;
  border-radius: 0.75rem;
  background: #111;
  color: white;
  cursor: pointer;
}`;

  jsCode = `document.querySelector('button')?.addEventListener('click', () => {
  alert('Hello from JavaScript!');
});`;

  autorun = true;
  activeTab: EditorTab = "html";
  previewDocument = "";

  private updateTimer?: number;

  connectedCallback() {
    super.connectedCallback();
    this.updatePreview();
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      color: CanvasText;
      font-family: system-ui, sans-serif;
    }

    .code-pen {
      display: grid;
      grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr);
      min-height: 520px;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
      border-radius: 1.25rem;
      background: Canvas;
    }

    .editor-panel {
      display: grid;
      grid-template-rows: auto 1fr;
      min-width: 0;
      border-right: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
      background: color-mix(in srgb, Canvas 94%, CanvasText 6%);
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem;
      border-bottom: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
    }

    .tab,
    .run {
      appearance: none;
      border: 0;
      font: inherit;
      cursor: pointer;
      border-radius: 0.75rem;
    }

    .tab {
      padding: 0.55rem 0.8rem;
      background: transparent;
      color: inherit;
    }

    .tab[aria-selected="true"] {
      background: CanvasText;
      color: Canvas;
    }

    .run {
      padding: 0.6rem 0.9rem;
      background: Highlight;
      color: HighlightText;
      font-weight: 600;
    }

    .editor-wrap {
      min-height: 0;
    }

    textarea {
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      min-height: 420px;
      resize: none;
      border: 0;
      outline: none;
      padding: 1rem;
      background: transparent;
      color: inherit;
      font:
        500 0.95rem/1.6 ui-monospace,
        SFMono-Regular,
        Menlo,
        Monaco,
        Consolas,
        "Liberation Mono",
        "Courier New",
        monospace;
      tab-size: 2;
    }

    .preview-panel {
      display: grid;
      grid-template-rows: auto 1fr;
      min-width: 0;
      background: Canvas;
    }

    .preview-title {
      display: flex;
      align-items: center;
      min-height: 3.65rem;
      padding: 0 1rem;
      border-bottom: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
      font-weight: 700;
    }

    iframe {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 460px;
      border: 0;
      background: white;
    }

    @media (max-width: 860px) {
      .code-pen {
        grid-template-columns: 1fr;
      }

      .editor-panel {
        border-right: 0;
        border-bottom: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
      }
    }
  `;

  render() {
    return html`
      <section class="code-pen">
        <div class="editor-panel">
          <div class="toolbar">
            <div class="tabs" role="tablist" aria-label="Code editors">
              ${this.renderTab("html", "HTML")} ${this.renderTab("css", "CSS")}
              ${this.renderTab("js", "JS")}
            </div>

            ${this.autorun
              ? nothing
              : html` <button class="run" type="button" @click=${this.updatePreview}>Run</button> `}
          </div>

          <div class="editor-wrap">
            <textarea
              spellcheck="false"
              .value=${this.activeCode}
              @input=${this.handleInput}
              @keydown=${this.handleTabIndent}
              aria-label="${this.activeTab.toUpperCase()} editor"
            ></textarea>
          </div>
        </div>

        <div class="preview-panel">
          <div class="preview-title">Preview</div>

          <iframe
            title="Live code preview"
            sandbox="allow-scripts"
            .srcdoc=${this.previewDocument}
          ></iframe>
        </div>
      </section>
    `;
  }

  private renderTab(tab: EditorTab, label: string) {
    return html`
      <button
        class="tab"
        type="button"
        role="tab"
        aria-selected=${this.activeTab === tab}
        @click=${() => {
          this.activeTab = tab;
        }}
      >
        ${label}
      </button>
    `;
  }

  private get activeCode() {
    switch (this.activeTab) {
      case "html":
        return this.htmlCode;
      case "css":
        return this.cssCode;
      case "js":
        return this.jsCode;
    }
  }

  private handleInput(event: Event) {
    const textarea = event.currentTarget as HTMLTextAreaElement;
    const value = textarea.value;

    switch (this.activeTab) {
      case "html":
        this.htmlCode = value;
        break;
      case "css":
        this.cssCode = value;
        break;
      case "js":
        this.jsCode = value;
        break;
    }

    this.dispatchEvent(
      new CustomEvent("code-change", {
        detail: {
          html: this.htmlCode,
          css: this.cssCode,
          js: this.jsCode,
        },
        bubbles: true,
        composed: true,
      }),
    );

    if (this.autorun) {
      window.clearTimeout(this.updateTimer);

      this.updateTimer = window.setTimeout(() => {
        this.updatePreview();
      }, 300);
    }
  }

  private updatePreview = () => {
    this.previewDocument = `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      ${this.cssCode}
    </style>
  </head>
  <body>
    ${this.htmlCode}

    <script>
      try {
        ${this.jsCode}
      } catch (error) {
        document.body.insertAdjacentHTML(
          'beforeend',
          '<pre style="color:red;white-space:pre-wrap;">' + error + '</pre>'
        );
      }
    </script>
  </body>
</html>
    `.trim();
  };

  private handleTabIndent(event: KeyboardEvent) {
    if (event.key !== "Tab") return;

    event.preventDefault();

    const textarea = event.currentTarget as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    textarea.value = `${value.slice(0, start)}  ${value.slice(end)}`;
    textarea.selectionStart = textarea.selectionEnd = start + 2;

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

customElements.define("code-pen", CodePen);
