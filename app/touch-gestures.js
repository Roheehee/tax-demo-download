(() => {
  // Some iOS Home Screen web apps still smart-zoom with touch-action: manipulation.
  const doubleTapMs = 360;
  const tapSlop = 10;
  const editable = 'input, textarea, select, label, [contenteditable]:not([contenteditable="false"])';
  let start;
  let previous;

  function reset() {
    start = previous = null;
  }

  const passive = { capture: true, passive: true };
  document.addEventListener('touchstart', event => {
    if (event.touches.length !== 1 || event.target.closest(editable)) {
      reset();
      return;
    }
    const touch = event.touches[0];
    start = { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
  }, passive);

  document.addEventListener('touchmove', event => {
    if (!start) return;
    const touch = event.touches[0];
    if (event.touches.length !== 1 || Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > tapSlop) reset();
  }, passive);

  document.addEventListener('touchend', event => {
    if (!start) return;
    const touch = event.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    if (event.touches.length || event.timeStamp - start.time > 300 || Math.hypot(x - start.x, y - start.y) > tapSlop) {
      reset();
      return;
    }

    // Allow rapid taps on two different controls, even when they are close together.
    const control = event.target.closest('button, a, [role="button"], [tabindex]');
    const isDoubleTap = previous && previous.control === control &&
      event.timeStamp - previous.time < doubleTapMs && Math.hypot(x - previous.x, y - previous.y) < 30;
    if (isDoubleTap && event.cancelable) event.preventDefault();
    previous = isDoubleTap ? null : { x, y, time: event.timeStamp, control };
    start = null;
  }, { capture: true, passive: false });

  document.addEventListener('touchcancel', reset, passive);
  window.addEventListener('pagehide', reset);
  window.addEventListener('hashchange', reset);
})();
