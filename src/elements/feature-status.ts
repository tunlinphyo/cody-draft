import featureStatusCss from "./styles/feature-status.css?raw";
import utilsCss from "./styles/utils.css?raw";

type BaselineStatus = "limited" | "newly" | "widely" | "no_data";
type BrowserStatus = "available" | "unavailable" | "preview" | "no_data";

type BrowserImplementation = {
  status?: BrowserStatus;
};

type FeatureResponse = {
  baseline?: {
    low_date?: string;
    status?: BaselineStatus;
  };
  browser_implementations?: {
    chrome?: BrowserImplementation;
    chrome_android?: BrowserImplementation;
    edge?: BrowserImplementation;
    firefox?: BrowserImplementation;
    firefox_android?: BrowserImplementation;
    safari?: BrowserImplementation;
    safari_ios?: BrowserImplementation;
  };
  developer_signals?: {
    link?: string;
    upvotes?: number;
  };
  feature_id?: string;
  name?: string;
};

const API_ENDPOINT = "https://api.webstatus.dev/v1/features/";
const baselineTitles: Record<BaselineStatus, string> = {
  limited: "Limited availability",
  newly: "Baseline newly available",
  widely: "Baseline widely available",
  no_data: "Unknown availability",
};
const shadowStyle = new CSSStyleSheet();
shadowStyle.replaceSync(`${utilsCss}\n${featureStatusCss}`);
const template = document.createElement("template");
template.innerHTML = `
  <div part="name"></div>
  <div part="summary">
    <span part="badge"></span>
    <span part="date"></span>
    <ul part="browsers"></ul>
  </div>
  <p part="description"></p>
  <p part="links"></p>
`;

export class FeatureStatus extends HTMLElement {
  static observedAttributes = ["featureid", "feature-id"];

  readonly #root = this.attachShadow({ mode: "open" });
  #abortController?: AbortController;
  #browserList?: HTMLUListElement;
  #date?: HTMLSpanElement;
  #descriptionElement?: HTMLParagraphElement;
  #links?: HTMLParagraphElement;
  #name?: HTMLDivElement;
  #badge?: HTMLSpanElement;

  constructor() {
    super();
    this.#root.adoptedStyleSheets = [shadowStyle];
  }

  connectedCallback() {
    void this.#load();
  }

  disconnectedCallback() {
    this.#abortController?.abort();
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      void this.#load();
    }
  }

  get featureId() {
    return this.getAttribute("feature-id") || this.getAttribute("featureid") || "";
  }

  async #load() {
    const featureId = this.featureId;
    this.#abortController?.abort();
    this.#abortController = new AbortController();

    this.#render(this.#fallbackFeature(featureId), "loading");

    if (!featureId) {
      this.#render(this.#fallbackFeature("Unknown feature"), "error");
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINT}${featureId}`, {
        cache: "force-cache",
        signal: this.#abortController.signal,
      });

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      this.#render((await response.json()) as FeatureResponse, "ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      this.#render(this.#fallbackFeature(featureId), "error");
    }
  }

  #fallbackFeature(name: string): FeatureResponse {
    return {
      baseline: { status: "no_data" },
      feature_id: this.featureId,
      name,
    };
  }

  #render(feature: FeatureResponse, state: "error" | "loading" | "ready") {
    this.#renderTemplate();

    const baseline = feature.baseline?.status || "no_data";
    const title = state === "loading" ? "Loading..." : baselineTitles[baseline];
    const date = this.#baselineDate(feature);
    const description =
      state === "loading" ? "Checking browser support data." : this.#description(baseline, date);

    if (this.#name) {
      this.#name.textContent = feature.name || this.featureId || "Unknown feature";
    }

    if (this.#badge) {
      this.#badge.textContent = title;
    }

    if (this.#date) {
      this.#date.textContent = date;
    }

    if (this.#descriptionElement) {
      this.#descriptionElement.textContent = description;
    }

    this.#renderBrowserList(feature, baseline);
    this.#renderLinks(feature);

    this.dataset.baseline = baseline;
    this.dataset.state = state;
  }

  #renderTemplate() {
    if (this.#root.hasChildNodes()) {
      return;
    }

    this.#root.replaceChildren(template.content.cloneNode(true));
    this.#name = this.#root.querySelector('[part="name"]') ?? undefined;
    this.#badge = this.#root.querySelector('[part="badge"]') ?? undefined;
    this.#date = this.#root.querySelector('[part="date"]') ?? undefined;
    this.#browserList = this.#root.querySelector('[part="browsers"]') ?? undefined;
    this.#descriptionElement = this.#root.querySelector('[part="description"]') ?? undefined;
    this.#links = this.#root.querySelector('[part="links"]') ?? undefined;
  }

  #renderBrowserList(feature: FeatureResponse, baseline: BaselineStatus) {
    const implementations = feature.browser_implementations || {};
    const browsers = [
      ["Chrome", implementations.chrome, implementations.chrome_android],
      ["Edge", implementations.edge],
      ["Firefox", implementations.firefox, implementations.firefox_android],
      ["Safari", implementations.safari, implementations.safari_ios],
    ] as const;

    this.#browserList?.replaceChildren(
      ...browsers.map(([label, ...impls]) => {
        const status = this.#browserStatus(baseline, impls);
        return this.#element(
          "li",
          { "data-status": status, part: "browser" },
          `${label}: ${status}`,
        );
      }),
    );
  }

  #browserStatus(
    baseline: BaselineStatus,
    implementations: readonly (BrowserImplementation | undefined)[],
  ) {
    if (baseline === "no_data") {
      return "unknown";
    }

    return implementations.every((implementation) => implementation?.status === "available")
      ? "available"
      : "unavailable";
  }

  #renderLinks(feature: FeatureResponse) {
    const featureId = feature.feature_id || this.featureId;
    const links: (HTMLAnchorElement | string)[] = [];

    if (featureId && feature.baseline?.status !== "no_data") {
      links.push(
        this.#link(
          `https://github.com/web-platform-dx/web-features/blob/main/features/${featureId}.yml`,
          "Learn more",
        ),
      );
    }

    if (feature.developer_signals?.link) {
      links.push(
        " ",
        this.#link(
          feature.developer_signals.link,
          `Developer signals: ${feature.developer_signals.upvotes || 0}`,
        ),
      );
    }

    this.#links?.replaceChildren(...links);
  }

  #baselineDate(feature: FeatureResponse) {
    return feature.baseline?.low_date
      ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
          new Date(feature.baseline.low_date),
        )
      : "";
  }

  #description(baseline: BaselineStatus, date: string) {
    if (baseline === "newly" && date) {
      return `Since ${date}, this feature works across the latest browser versions. It may not work in older browsers.`;
    }

    if (baseline === "widely" && date) {
      return `This feature is well established across browsers and has been available since ${date}.`;
    }

    if (baseline === "limited") {
      return "This feature is not Baseline because it does not work in some widely-used browsers.";
    }

    return "Browser support information is not available for this feature.";
  }

  #link(href: string, label: string) {
    const link = this.#element("a", { href, rel: "noopener noreferrer", target: "_blank" }, label);
    return link;
  }

  #element<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    attributes: Record<string, string> = {},
    text?: string,
  ) {
    const element = document.createElement(tagName);

    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, value);
    }

    if (text !== undefined) {
      element.textContent = text;
    }

    return element;
  }
}

if (!customElements.get("feature-status")) {
  customElements.define("feature-status", FeatureStatus);
}
