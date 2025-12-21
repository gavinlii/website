// drag.js — global draggable window manager

let topZ = 10;
let draggingWin = null;
let offsetX = 0;
let offsetY = 0;

function bringToFront(win) {
  topZ += 1;
  win.style.zIndex = topZ;
}

function promoteToBodyAndFreeze(win) {
  const rect = win.getBoundingClientRect();

  // move to body to avoid transformed-parent issues
  if (win.parentElement !== document.body) {
    document.body.appendChild(win);
  }

  win.style.position = "fixed";
  win.style.left = rect.left + "px";
  win.style.top  = rect.top  + "px";

  win.style.right = "auto";
  win.style.bottom = "auto";
  win.style.margin = "0";
  win.style.transform = "none";
}

function onMouseMove(e) {
  if (!draggingWin) return;

  const winRect = draggingWin.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let newLeft = e.clientX - offsetX;
  let newTop  = e.clientY - offsetY;

  // ---- clamps babyyyy ----

  // horizontal: keep at least ~40px visible
  const minLeft = -winRect.width + 40;
  const maxLeft = viewportW - 40;

  // vertical: keep titlebar reachable
  const titlebar = draggingWin.querySelector(".titlebar");
  const barHeight = titlebar ? titlebar.offsetHeight : 32;

  const minTop = 0;
  const maxTop = viewportH - barHeight;

  newLeft = Math.min(Math.max(newLeft, minLeft), maxLeft);
  newTop  = Math.min(Math.max(newTop, minTop), maxTop);

  draggingWin.style.left = newLeft + "px";
  draggingWin.style.top  = newTop  + "px";
}

function onMouseUp() {
  draggingWin = null;
  document.body.classList.remove("dragging");
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
}

/* click anywhere on window to bring to dront */
document.addEventListener("mousedown", (e) => {
  const win = e.target.closest(".desk-panel");
  if (!win) return;
  bringToFront(win);
});

document.addEventListener("mousedown", (e) => {
  const bar = e.target.closest(".titlebar");
  if (!bar) return;

  // don't drag when clicking interactive controls
  if (e.target.closest("a, button")) return;

  const win = bar.closest(".desk-panel");
  if (!win) return;

  bringToFront(win);
  promoteToBodyAndFreeze(win);

  const rect = win.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
  draggingWin = win;

  document.body.classList.add("dragging");
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  e.preventDefault(); // prevent text selection
});
