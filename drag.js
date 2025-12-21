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

function bringToFront(win) {
  topZ += 1;
  win.style.zIndex = topZ;
}

function promoteToBodyAndFreeze(win) {
  const rect = win.getBoundingClientRect();

  // Move to <body> so transformed parents can't distort "fixed"
  if (win.parentElement !== document.body) {
    document.body.appendChild(win);
  }

  baseLeft = rect.left;
  baseTop = rect.top;

  win.style.position = "fixed";
  win.style.left = baseLeft + "px";
  win.style.top = baseTop + "px";

  // Reset layout props that can cause jumps
  win.style.right = "auto";
  win.style.bottom = "auto";
  win.style.margin = "0";
  win.style.transform = "translate3d(0px, 0px, 0px)";
}

function clampPosition(targetLeft, targetTop) {
  if (!draggingWin) return { left: targetLeft, top: targetTop };

  const winRect = draggingWin.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Horizontal: keep at least ~40px visible
  const minLeft = -winRect.width + 40;
  const maxLeft = vw - 40;

  // Vertical: keep titlebar reachable
  const titlebar = draggingWin.querySelector(".titlebar");
  const barHeight = titlebar ? titlebar.offsetHeight : 32;

  const minTop = 0;
  const maxTop = vh - barHeight;

  const left = Math.min(Math.max(targetLeft, minLeft), maxLeft);
  const top = Math.min(Math.max(targetTop, minTop), maxTop);

  return { left, top };
}

function applyDrag(clientX, clientY) {
  if (!draggingWin) return;

  // desired new top/left in viewport px
  const desiredLeft = clientX - offsetX;
  const desiredTop = clientY - offsetY;

  const { left, top } = clampPosition(desiredLeft, desiredTop);

  // move using GPU transform for smoothness
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

function startDrag(win, handleEl, clientX, clientY, pointerId = null) {
  bringToFront(win);
  promoteToBodyAndFreeze(win);

  const rect = win.getBoundingClientRect();
  offsetX = clientX - rect.left;
  offsetY = clientY - rect.top;

  draggingWin = win;
  document.body.classList.add("dragging");

  activePointerId = pointerId;

  // Capture pointer so drag continues even if finger/mouse leaves titlebar
  if (pointerId !== null && handleEl && handleEl.setPointerCapture) {
    try {
      handleEl.setPointerCapture(pointerId);
    } catch (_) {
      // ignore
    }
  }
}

function commitTransformToLeftTop(win) {
  const tr = getComputedStyle(win).transform;
  if (!tr || tr === "none") return;

  // Parse DOMMatrix (supported in modern browsers)
  const m = new DOMMatrixReadOnly(tr);

  const committedLeft = baseLeft + m.m41;
  const committedTop = baseTop + m.m42;

  win.style.transform = "translate3d(0px, 0px, 0px)";
  win.style.left = committedLeft + "px";
  win.style.top = committedTop + "px";

  // Update base for subsequent drags
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

/* bring to front: click/tap anywhere on a window */
document.addEventListener("pointerdown", (e) => {
  const win = e.target.closest(".desk-panel");
  if (!win) return;
  bringToFront(win);
});

/* drag start: ONLY from the MAIN (top-level) titlebar; NOT on buttons/links
   mobile: allow +20px slop below the main titlebar */
document.addEventListener(
  "pointerdown",
  (e) => {
    // Ignore interactions with controls
    if (e.target.closest("a, button")) return;

    const win = e.target.closest(".desk-panel");
    if (!win) return;

    // Main titlebar = direct child of the window (prevents nested panel titlebars)
    const mainBar = win.querySelector(":scope > .titlebar");
    if (!mainBar) return;

    const mobile = window.matchMedia("(max-width: 900px)").matches;

    if (!mobile) {
      // Desktop: must click *on the main bar itself* (not nested bars)
      const hitBar = e.target.closest(".titlebar");
      if (hitBar !== mainBar) return;

      startDrag(win, mainBar, e.clientX, e.clientY, e.pointerId);
      e.preventDefault();
      return;
    }

    // Mobile: main bar + 20px hit slop below it
    const rect = mainBar.getBoundingClientRect();
    const y = e.clientY;
    const paddedBottom = rect.bottom + 20;

    if (y < rect.top || y > paddedBottom) return;

    startDrag(win, mainBar, e.clientX, e.clientY, e.pointerId);
    e.preventDefault();
  },
  { passive: false }
);

/* Drag move (pointer): smooth via rAF */
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

/* Touch fallback: prevents pull-to-refresh on iOS during drag
   (even when Pointer Events exist, this helps Safari)
*/
window.addEventListener(
  "touchmove",
  (e) => {
    if (!draggingWin) return;
    // If we're dragging, do not let the page scroll / refresh
    e.preventDefault();
  },
  { passive: false }
);
