(function () {
  const script = document.currentScript;
  if (!script) return;
  const formId = script.getAttribute("data-form-id");
  if (!formId) { console.error("Formly widget needs a data-form-id."); return; }
  const origin = new URL(script.src).origin;
  const button = document.createElement("button");
  button.textContent = "✦";
  button.setAttribute("aria-label", "Open form chat");
  Object.assign(button.style, { position:"fixed", right:"22px", bottom:"22px", width:"58px", height:"58px", borderRadius:"50%", border:"0", background:"#4f46e5", color:"white", fontSize:"25px", boxShadow:"0 8px 24px #0003", zIndex:"2147483000", cursor:"pointer" });
  const panel = document.createElement("div");
  Object.assign(panel.style, { display:"none", position:"fixed", right:"22px", bottom:"92px", width:"min(360px, calc(100vw - 32px))", height:"min(540px, calc(100vh - 130px))", background:"white", border:"1px solid #e2e8f0", borderRadius:"18px", boxShadow:"0 16px 50px #0002", zIndex:"2147483000", overflow:"hidden" });
  const frame = document.createElement("iframe");
  frame.src = origin + "/forms/" + encodeURIComponent(formId) + "?embed=1";
  frame.title = "Formly chatbot form";
  Object.assign(frame.style, { width:"100%", height:"100%", border:"0" });
  panel.appendChild(frame);
  button.onclick = function () { panel.style.display = panel.style.display === "none" ? "block" : "none"; button.textContent = panel.style.display === "none" ? "✦" : "×"; };
  document.body.appendChild(panel);
  document.body.appendChild(button);
})();