/** Tracks only fingers that began on the scene, never the joystick or buttons. */
export function createCameraGesture() {
  const fingers = new Map();
  let start = null;
  let dragging = false;
  let pinchDistance = 0;
  const distance = () => {
    const [a, b] = [...fingers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const rebase = () => {
    start = fingers.size === 1 ? { ...fingers.values().next().value } : null;
    dragging = false;
    pinchDistance = fingers.size === 2 ? distance() : 0;
  };
  return {
    down(id, x, y) {
      if (fingers.size >= 2 || fingers.has(id)) return false;
      fingers.set(id, { x, y });
      rebase();
      return true;
    },
    move(id, x, y) {
      const previous = fingers.get(id);
      if (!previous) return { x: 0, y: 0, pinch: 0 };
      fingers.set(id, { x, y });
      if (fingers.size === 2) {
        const next = distance();
        const pinch = pinchDistance - next;
        pinchDistance = next;
        return { x: 0, y: 0, pinch };
      }
      if (!dragging && Math.hypot(x - start.x, y - start.y) < 5)
        return { x: 0, y: 0, pinch: 0 };
      const origin = dragging ? previous : start;
      dragging = true;
      return { x: x - origin.x, y: y - origin.y, pinch: 0 };
    },
    up(id) {
      if (fingers.delete(id)) rebase();
    },
    reset() {
      fingers.clear();
      rebase();
    },
  };
}
