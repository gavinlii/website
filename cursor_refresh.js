// refresh custom cursor when mouse re-enters page

function refreshCursor() {
  // 1-frame toggle forces cursor recomputation
  document.documentElement.style.cursor = "none";
  requestAnimationFrame(() => {
    document.documentElement.style.cursor = "";
  });
}

// fires when pointer comes back from browser chrome
document.addEventListener("mouseenter", refreshCursor);

// first move after re-entry
document.addEventListener("mousemove", (e) => {
  // only run once per
  if (document.documentElement.dataset.cursorRefreshed) return;
  document.documentElement.dataset.cursorRefreshed = "1";
  refreshCursor();
  setTimeout(() => delete document.documentElement.dataset.cursorRefreshed, 50);
}, { passive: true });
