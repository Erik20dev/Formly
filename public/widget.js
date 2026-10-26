(() => {
  "use strict";

  const scripts = Array.from(document.scripts);
  const script = scripts.find((item) => {
    if (!item.src) return false;

    try {
      return new URL(item.src, document.baseURI).pathname.endsWith("/widget.js");
    } catch {
      return false;
    }
  });

  if (!script) {
    console.error("Formly Widget: Could not find the widget script.");
    return;
  }

  const scriptUrl = new URL(script.src, document.baseURI);
  const origin = scriptUrl.origin;
  const formId = script.dataset.formId;

  if (!formId) {
    console.error("Formly Widget: Missing data-form-id attribute.");
    return;
  }

  const color = script.dataset.color || "#4f46e5";
  const position = script.dataset.position === "left" ? "left" : "right";
  const avatar = script.dataset.avatar || "✦";
  const mode = script.dataset.mode === "inline" ? "inline" : "floating";
  const targetSelector = script.dataset.target || "";
  const formUrl =
    origin + "/forms/" + encodeURIComponent(formId) + "?embed=1";

  if (!/^#[0-9a-f]{3,8}$/i.test(color) &&
      !/^rgb(a)?\(/i.test(color) &&
      !/^hsl(a)?\(/i.test(color)) {
    console.warn("Formly Widget: The supplied color may be invalid.");
  }

  const style = document.createElement("style");
  style.textContent = `
    .formly-widget-launcher {
      position: fixed;
      bottom: 24px;
      z-index: 2147483000;
      width: 58px;
      height: 58px;
      border: 0;
      border-radius: 50%;
      background: var(--formly-color, #4f46e5);
      color: #fff;
      box-shadow: 0 8px 28px rgba(0, 0, 0, .2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font: inherit;
      font-size: 25px;
      transition: transform .2s ease, box-shadow .2s ease;
    }

    .formly-widget-launcher:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 12px 32px rgba(0, 0, 0, .24);
    }

    .formly-widget-launcher:focus-visible {
      outline: 3px solid var(--formly-color, #4f46e5);
      outline-offset: 4px;
    }

    .formly-widget-launcher.formly-left {
      left: 24px;
    }

    .formly-widget-launcher.formly-right {
      right: 24px;
    }

    .formly-widget-panel {
      position: fixed;
      bottom: 94px;
      z-index: 2147482999;
      width: min(360px, calc(100vw - 32px));
      height: min(540px, calc(100vh - 130px));
      background: #fff;
      border: 1px solid rgba(0, 0, 0, .1);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 16px 48px rgba(0, 0, 0, .2);
      opacity: 0;
      visibility: hidden;
      transform: translateY(12px) scale(.98);
      transform-origin: bottom right;
      transition:
        opacity .2s ease,
        transform .2s ease,
        visibility .2s ease;
    }

    .formly-widget-panel.formly-left {
      left: 24px;
      transform-origin: bottom left;
    }

    .formly-widget-panel.formly-right {
      right: 24px;
    }

    .formly-widget-panel.formly-open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    .formly-widget-panel iframe,
    .formly-widget-inline iframe {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 420px;
      border: 0;
      background: #fff;
    }

    .formly-widget-inline {
      width: 100%;
      min-width: 0;
      min-height: 420px;
      overflow: hidden;
      border-radius: 12px;
    }

    .formly-widget-inline iframe {
      min-height: 560px;
    }

    @media (max-width: 480px) {
      .formly-widget-launcher.formly-left {
        left: 16px;
      }

      .formly-widget-launcher.formly-right {
        right: 16px;
      }

      .formly-widget-panel.formly-left {
        left: 16px;
      }

      .formly-widget-panel.formly-right {
        right: 16px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .formly-widget-launcher,
      .formly-widget-panel {
        transition: none;
      }
    }
  `;

  (document.head || document.documentElement).appendChild(style);

  function createIframe(className) {
    const iframe = document.createElement("iframe");
    iframe.src = formUrl;
    iframe.title = "Formly form";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.setAttribute("allow", "clipboard-write");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";

    if (className) iframe.className = className;

    return iframe;
  }

  if (mode === "inline") {
    let target = null;

    if (targetSelector) {
      try {
        target = document.querySelector(targetSelector);
      } catch {
        console.error("Formly Widget: Invalid data-target selector.");
        return;
      }
    }

    target = target || script.parentElement;

    if (!target || target === document.body || target === document.head) {
      console.error(
        "Formly Widget: Inline mode needs a target element. Add a container and set data-target to its selector."
      );
      return;
    }

    const inlineContainer = document.createElement("div");
    inlineContainer.className = "formly-widget-inline";
    inlineContainer.style.setProperty("--formly-color", color);
    inlineContainer.appendChild(createIframe());

    target.appendChild(inlineContainer);
    return;
  }

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className =
    "formly-widget-launcher formly-" + position;
  launcher.textContent = avatar;
  launcher.style.setProperty("--formly-color", color);
  launcher.setAttribute("aria-label", "Open form");
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-haspopup", "dialog");

  const panel = document.createElement("div");
  panel.className =
    "formly-widget-panel formly-" + position;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Formly form");
  panel.setAttribute("aria-hidden", "true");

  panel.appendChild(createIframe());

  function setOpen(open) {
    panel.classList.toggle("formly-open", open);
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Close form" : "Open form");
    panel.setAttribute("aria-hidden", String(!open));
    launcher.textContent = open ? "×" : avatar;
  }

  launcher.addEventListener("click", () => {
    const isOpen = panel.classList.contains("formly-open");
    setOpen(!isOpen);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" &&
        panel.classList.contains("formly-open")) {
      setOpen(false);
      launcher.focus();
    }
  });

  (document.body || document.documentElement).appendChild(panel);
  (document.body || document.documentElement).appendChild(launcher);
})();
