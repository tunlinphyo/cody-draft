import themedIframeCss from "./styles/themed-iframe.css?raw";
import utilsCss from "./styles/utils.css?raw";

type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "themed-iframe-theme";
const LAYER_STORAGE_KEY = "themed-iframe-layer";
const themeModes: ThemeMode[] = ["system", "light", "dark"];
const sharedSettings = {
  theme: "system" as ThemeMode,
  layerEnabled: false,
};
const themedIframes = new Set<ThemedIframe>();
let hasInitializedSharedState = false;
const shadowStyle = new CSSStyleSheet();
shadowStyle.replaceSync(`${utilsCss}\n${themedIframeCss}`);
const template = document.createElement("template");
template.innerHTML = `
  <div part="root">
    <div part="toolbar" aria-label="Preview theme"></div>
    <div part="frame">
      <div part="loading" role="status" aria-live="polite" aria-busy="true">
        <span part="spinner" aria-hidden="true"></span>
        <span part="loading-text">Loading preview...</span>
      </div>
      <iframe part="iframe"></iframe>
    </div>
    <footer part="footer">
      <label part="switch">
        <span part="switch-label">Layout Borders</span>
        <input type="checkbox" part="switch-input">
        <span part="action-toggle" aria-hidden="true"></span>
      </label>
    </footer>
    <div part="source">
      <a target="_blank" rel="noopener noreferrer">Open Source Code</a>
    </div>
  </div>
`;

function readThemeMode(value: string | null): ThemeMode | undefined {
  return value === "system" || value === "light" || value === "dark" ? value : undefined;
}

function initializeSharedState() {
  if (hasInitializedSharedState) {
    return;
  }

  sharedSettings.theme = readThemeMode(localStorage.getItem(STORAGE_KEY)) ?? "system";
  sharedSettings.layerEnabled = localStorage.getItem(LAYER_STORAGE_KEY) === "true";
  hasInitializedSharedState = true;
}

function updateSharedTheme(theme: ThemeMode) {
  sharedSettings.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  notifyThemedIframes();
}

function updateSharedLayer(enabled: boolean) {
  sharedSettings.layerEnabled = enabled;
  localStorage.setItem(LAYER_STORAGE_KEY, String(enabled));
  notifyThemedIframes();
}

function notifyThemedIframes() {
  for (const element of themedIframes) {
    element.syncSharedSettings();
  }
}

export class ThemedIframe extends HTMLElement {
  static observedAttributes = ["src", "title", "height", "max-width"];

  readonly #root = this.attachShadow({ mode: "open" });
  #frame?: HTMLDivElement;
  #iframe?: HTMLIFrameElement;
  #loading?: HTMLDivElement;
  #layerInput?: HTMLInputElement;
  #sourceCodeLink?: HTMLAnchorElement;
  #isLoading = true;

  constructor() {
    super();
    this.#root.adoptedStyleSheets = [shadowStyle];
  }

  connectedCallback() {
    initializeSharedState();
    themedIframes.add(this);

    if (!this.#root.hasChildNodes()) {
      this.#render();
    }

    this.#renderLoadingState();
    this.#syncAttributes();
    this.syncSharedSettings();
    this.#syncIframeState();
  }

  disconnectedCallback() {
    themedIframes.delete(this);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (!this.#root.hasChildNodes()) {
      return;
    }

    if (name === "src" && oldValue !== newValue) {
      this.#isLoading = true;
      this.#renderLoadingState();
    }

    this.#syncAttributes();
    this.#syncIframeState();
  }

  syncSharedSettings() {
    this.#applyFrameSettings();
    this.#renderThemeButtons();

    if (this.#layerInput) {
      this.#layerInput.checked = sharedSettings.layerEnabled;
    }
  }

  #render() {
    this.#root.replaceChildren(template.content.cloneNode(true));

    this.#frame = this.#root.querySelector('[part="frame"]') ?? undefined;
    this.#iframe = this.#root.querySelector("iframe") ?? undefined;
    this.#loading = this.#root.querySelector('[part="loading"]') ?? undefined;
    this.#layerInput = this.#root.querySelector('[part="switch-input"]') ?? undefined;
    this.#sourceCodeLink = this.#root.querySelector('[part="source"] a') ?? undefined;

    this.#iframe?.addEventListener("load", () => this.#handleLoad());
    this.#layerInput?.addEventListener("change", () => {
      updateSharedLayer(this.#layerInput?.checked ?? false);
    });

    this.#renderThemeButtons();
  }

  #renderThemeButtons() {
    const toolbar = this.#root.querySelector('[part="toolbar"]');
    if (!toolbar) {
      return;
    }

    toolbar.replaceChildren(
      ...themeModes.map((mode) => {
        const button = document.createElement("button");
        button.type = "button";
        button.part.add("toggle");
        button.toggleAttribute("data-active", sharedSettings.theme === mode);
        button.textContent = mode;
        button.addEventListener("click", () => updateSharedTheme(mode));
        return button;
      }),
    );
  }

  #syncAttributes() {
    if (this.#frame) {
      this.#frame.style.width = "100%";
      this.#frame.style.maxWidth = this.getAttribute("max-width") || "32rem";
      this.#frame.style.height = this.getAttribute("height") || "34rem";
    }

    if (this.#iframe) {
      const src = this.getAttribute("src") || "";

      if (this.#iframe.getAttribute("src") !== src) {
        this.#iframe.src = src;
      }

      this.#iframe.title = this.getAttribute("title") || "";
      this.#iframe.style.width = "100%";
      this.#iframe.style.height = "100%";
      this.#iframe.style.display = "block";
      this.#iframe.style.margin = "0 auto";
      this.#iframe.style.overflow = "hidden";
    }

    if (this.#sourceCodeLink) {
      const src = this.getAttribute("src") || "";
      this.#sourceCodeLink.href = `https://github.com/tunlinphyo/vuepress-notebook/blob/main/public${src}`;
    }
  }

  #handleLoad() {
    this.#isLoading = false;
    this.#renderLoadingState();
    this.#applyFrameSettings();
  }

  #syncIframeState() {
    const doc = this.#iframe?.contentDocument;
    if (doc?.readyState !== "complete") {
      return;
    }

    this.#isLoading = false;
    this.#renderLoadingState();
    this.#applyFrameSettings();
  }

  #renderLoadingState() {
    this.#loading?.toggleAttribute("hidden", !this.#isLoading);
    this.#iframe?.toggleAttribute("data-loading", this.#isLoading);
  }

  #applyFrameSettings() {
    const doc = this.#iframe?.contentDocument;
    if (!doc) {
      return;
    }

    doc.documentElement.style.colorScheme =
      sharedSettings.theme === "system" ? "light dark" : sharedSettings.theme;

    if (sharedSettings.layerEnabled) {
      doc.documentElement.setAttribute("data-layer", "");
    } else {
      doc.documentElement.removeAttribute("data-layer");
    }
  }
}

if (!customElements.get("themed-iframe")) {
  customElements.define("themed-iframe", ThemedIframe);
}
