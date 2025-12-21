// drag.js (desktop + mobile)

let topZ = 10;

let draggingWin = null;
let offsetX = 0;
let offsetY = 0;

let activePointerId = null;
let captureEl = null;

function bringToFront(win) {
  topZ += 1;
  win.style.zIndex = topZ;
}

function promoteToBodyAndFreeze(win) {
  const rect = win.getBoundingClientRect();

  // avoid transformed-parent issues by moving to body
  if (win.parentElement !== document.body) {
    document.body.appendChild(win);
  }

  win.style.position = "fixed";
  win.style.left = rect.left + "px";
  win.style.top = rect.top + "px";

  // clear layout props that can cause jumps
  win.style.right = "auto";
  win.style.bottom = "auto";
  win.style.margin = "0";
  win.style.transform = "none";
}

function clampAndMove(clientX, clientY) {
  if (!draggingWin) return;

  const winRect = draggingWin.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let newLeft = clientX - offsetX;
  let newTop = clientY - offsetY;

  // keep ~40px visible horizontally
  const minLeft = -winRect.width + 40;
  const maxLeft = vw - 40;

  // keep titlebar reachable vertically
  const titlebar = draggingWin.querySelector(".titlebar");
  const barHeight = titlebar ? titlebar.offsetHeight : 32;

  const minTop = 0;
  const maxTop = vh - barHeight;

  newLeft = Math.min(Math.max(newLeft, minLeft), maxLeft);
  newTop = Math.min(Math.max(newTop, minTop), maxTop);

  draggingWin.style.left = newLeft + "px";
  draggingWin.style.top = newTop + "px";
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
  captureEl = handleEl;

  // don't crash if pointer capture doesn' work
  if (pointerId !== null && captureEl && captureEl.setPointerCapture) {
    try {
      captureEl.setPointerCapture(pointerId);
    } catch (_) {}
  }
}

function stopDrag() {
  draggingWin = null;
  activePointerId = null;
  captureEl = null;
  document.body.classList.remove("dragging");
}

/*pointer events path]*/
const supportsPointer = "PointerEvent" in window;

if (supportsPointer) {
  document.addEventListener(
    "pointerdown",
    (e) => {
      const win = e.target.closest(".desk-panel");
      if (!win) return;

      // click anywhere -> bring to front
      bringToFront(win);

      // drag only from titlebar, excluding links/buttons
      const bar = e.target.closest(".titlebar");
      if (!bar) return;
      if (e.target.closest("a, button")) return;

      startDrag(win, bar, e.clientX, e.clientY, e.pointerId);
      e.preventDefault(); // only when dragging
    },
    { passive: false }
  );

  window.addEventListener(
    "pointermove",
    (e) => {
      if (!draggingWin) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      clampAndMove(e.clientX, e.clientY);
    },
    { passive: true }
  );

  window.addEventListener("pointerup", (e) => {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    stopDrag();
  });

  window.addEventListener("pointercancel", (e) => {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    stopDrag();
  });
}

/* mouse for desktop */
if (!supportsPointer) {
  document.addEventListener("mousedown", (e) => {
    const win = e.target.closest(".desk-panel");
    if (!win) return;

    bringToFront(win);

    const bar = e.target.closest(".titlebar");
    if (!bar) return;
    if (e.target.closest("a, button")) return;

    startDrag(win, bar, e.clientX, e.clientY, null);
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!draggingWin) return;
    clampAndMove(e.clientX, e.clientY);
  });

  window.addEventListener("mouseup", stopDrag);
}
