import "./markdown.css";

import "./elements/feature-status";
import "./elements/themed-iframe";

const app = document.querySelector<HTMLDivElement>("#app");
const content = document.querySelector<HTMLTemplateElement>("#markdown-content");

if (app && content) {
  app.innerHTML = content.innerHTML;
}
