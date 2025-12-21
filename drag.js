// drag.js — window manager (desktop + mobile), smooth + clamped + no jump

let topZ = 10;

let draggingWin = null;
let activePointerId = null;

// Offset from pointer to window's top-left (in px, viewport coords)
let offsetX = 0;
let offsetY = 0;

// Base (frozen) top/left in px; we drag using transform deltas from this base
let baseLeft = 0;
let baseTop = 0;

// rAF throttling
let rafPending = false;
let lastClientX = 0;
let lastClientY = 0;

function isMobile() {
  return window.matchMedia("(max-width: 900px)").matches;
}

function bringToFront(win) {
  topZ += 1;
  win.style.zIndex = topZ;
}

function promoteToBodyAndFreeze(win) {
  const rect = win.getBoundingClientRect();

  if (win.parentElement !== document.body) {
    document.body.appendChild(win);
  }

  baseLeft = rect.left;
  baseTop = rect.top;

  win.style.position = "fixed";
  win.style.left = baseLeft + "px";
  win.style.top = baseTop + "px";

  win.style.right = "auto";
  win.style.bottom = "auto";
  win.style.margin = "0";
  win.style.transform = "translate3d(0px, 0px, 0px)";
}

function clampPosition(targetLeft, targetTop) {
  const winRect = draggingWin.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Horizontal: keep ~40px visible
  const minLeft = -winRect.width + 40;
  const maxLeft = vw - 40;

  // Vertical: keep titlebar reachable
  const titlebar = draggingWin.querySelector(".titlebar");
  const barHeight = titlebar ? titlebar.offsetHeight : 32;

  const minTop = 0;
  const maxTop = vh - barHeight;

  return {
    left: Math.min(Math.max(targetLeft, minLeft), maxLeft),
    top: Math.min(Math.max(targetTop, minTop), maxTop),
  };
}

function applyDrag(clientX, clientY) {
  if (!draggingWin) return;

  const desiredLeft = clientX - offsetX;
  const desiredTop = clientY - offsetY;

  const { left, top } = clampPosition(desiredLeft, desiredTop);

  const dx = left - baseLeft;
  const dy = top - baseTop;

  draggingWin.style.transform = `translate3d(${dx}px, ${dy}px, 0px)`;
}

function scheduleDrag(clientX, clientY) {
  lastClientX = clientX;
  lastClientY = clientY;

  if (rafPending) return;
  rafPending = true;

  requestAnimationFrame(() => {
    rafPending = false;
    applyDrag(lastClientX, lastClientY);
  });
}

function startDrag(win, handleEl, clientX, clientY, pointerId) {
  bringToFront(win);
  promoteToBodyAndFreeze(win);

  const rect = win.getBoundingClientRect();
  offsetX = clientX - rect.left;
  offsetY = clientY - rect.top;

  draggingWin = win;
  activePointerId = pointerId;

  document.body.classList.add("dragging");

  if (handleEl && handleEl.setPointerCapture) {
    try {
      handleEl.setPointerCapture(pointerId);
    } catch (_) {}
  }
}

function commitTransformToLeftTop(win) {
  const tr = getComputedStyle(win).transform;
  if (!tr || tr === "none") return;

  const m = new DOMMatrixReadOnly(tr);

  const committedLeft = baseLeft + m.m41;
  const committedTop = baseTop + m.m42;

  win.style.transform = "translate3d(0px, 0px, 0px)";
  win.style.left = committedLeft + "px";
  win.style.top = committedTop + "px";

  baseLeft = committedLeft;
  baseTop = committedTop;
}

function stopDrag() {
  if (draggingWin) {
    commitTransformToLeftTop(draggingWin);
  }

  draggingWin = null;
  activePointerId = null;
  document.body.classList.remove("dragging");
}

/* -----------------------------------------
   Bring to front: click/tap anywhere
------------------------------------------ */
document.addEventListener("pointerdown", (e) => {
  const win = e.target.closest(".desk-panel");
  if (!win) return;
  bringToFront(win);
});

/* -----------------------------------------
   Drag start:
   - Desktop: titlebar only
   - Mobile: entire window
------------------------------------------ */
document.addEventListener(
  "pointerdown",
  (e) => {
    const win = e.target.closest(".desk-panel");
    if (!win) return;

    // Never drag when interacting with controls
    if (e.target.closest("a, button, input, textarea, select")) return;

    const mobile = isMobile();

    if (!mobile) {
      // Desktop → titlebar only
      const bar = e.target.closest(".titlebar");
      if (!bar) return;

      startDrag(win, bar, e.clientX, e.clientY, e.pointerId);
      e.preventDefault();
      return;
    }

    // Mobile → drag from anywhere inside window
    const handle = win.querySelector(".titlebar") || win;
    startDrag(win, handle, e.clientX, e.clientY, e.pointerId);
    e.preventDefault();
  },
  { passive: false }
);

/* -----------------------------------------
   Drag move
------------------------------------------ */
window.addEventListener(
  "pointermove",
  (e) => {
    if (!draggingWin) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    scheduleDrag(e.clientX, e.clientY);
  },
  { passive: true }
);

window.addEventListener("pointerup", (e) => {
  if (!draggingWin) return;
  if (activePointerId !== null && e.pointerId !== activePointerId) return;
  stopDrag();
});

window.addEventListener("pointercancel", (e) => {
  if (!draggingWin) return;
  if (activePointerId !== null && e.pointerId !== activePointerId) return;
  stopDrag();
});

/* -----------------------------------------
   iOS/Safari: prevent pull-to-refresh during drag
------------------------------------------ */
window.addEventListener(
  "touchmove",
  (e) => {
    if (!draggingWin) return;
    e.preventDefault();
  },
  { passive: false }
);
