// layout.js — inject shared chrome (photo + nav + reroll) on non-index pages

const backgrounds = [
  "/assets/bg1.webp",
  "/assets/bg2-min.webp",
  "/assets/bg3-min.webp",
  "/assets/bg4.webp",
  "/assets/bg6-min.webp",
];

// Apply stored background immediately
(function applyStoredBg() {
  const storedBg = localStorage.getItem("current_bg");
  if (storedBg) {
    document.body.style.backgroundImage = `url('${storedBg}')`;
  }
})();

async function injectChrome() {
  // Don’t inject on landing page /
  const path = window.location.pathname.replace(/\/$/, "");
  if (path === "") return;

  const res = await fetch("/partials/chrome.html", { cache: "no-store" });
  if (!res.ok) {
    console.warn("Failed to load chrome.html:", res.status);
    return;
  }

  const html = await res.text();
  document.body.insertAdjacentHTML("afterbegin", html);

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