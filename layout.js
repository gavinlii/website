// layout.js — inject shared chrome (photo + nav + reroll) on non-index pages

const backgrounds = [
  "assets/bg1.webp",
  "assets/bg2-min.webp",
  "assets/bg3-min.webp",
  "assets/bg4.webp",
  "assets/bg6-min.webp",
];

// Apply stored background immediately
(function applyStoredBg() {
  const storedBg = localStorage.getItem("current_bg");
  if (storedBg) document.body.style.backgroundImage = `url('${storedBg}')`;
})();

async function injectChrome() {
  // Don’t inject on index.html
  const path = window.location.pathname.split("/").pop() || "index.html";
  if (path === "index.html") return;

  // Pull in shared chrome HTML
  const res = await fetch("partials/chrome.html", { cache: "no-store" });
  if (!res.ok) return;
  const html = await res.text();

  // Insert at top of <body>
  document.body.insertAdjacentHTML("afterbegin", html);

  // Wire reroll button
  const rerollBtn = document.querySelector(".reroll-btn");
  if (rerollBtn) {
    rerollBtn.addEventListener("click", () => {
      const current = localStorage.getItem("current_bg");
      const options = backgrounds.filter(src => src !== current);
      const next = options[Math.floor(Math.random() * options.length)] || backgrounds[0];

      document.body.style.backgroundImage = `url('${next}')`;
      localStorage.setItem("current_bg", next);
      localStorage.setItem("last_bg", next);
    });
  }
}

injectChrome();