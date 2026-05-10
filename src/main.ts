import "./style.css";

document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains("copy-btn")) {
    const code = target.dataset.code || "";
    navigator.clipboard
      .writeText(code)
      .then(() => {
        const originalText = target.textContent;
        target.textContent = "Copied!";
        setTimeout(() => {
          target.textContent = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  }
});
