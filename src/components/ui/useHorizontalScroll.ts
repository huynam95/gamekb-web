import { useCallback, useEffect, useState, type DragEvent, type RefObject } from "react";

/**
 * Make a horizontally overflowing row usable with a plain mouse wheel.
 *
 * Trackpads and touch screens already scroll sideways, but most Windows mice
 * only have a vertical wheel, so a row with a hidden scrollbar cannot be
 * reached. This hook:
 * - turns vertical wheel movement into horizontal scrolling while the row
 *   still has room to scroll in that direction (the page scrolls otherwise),
 * - reports whether there is more content on either side, for arrow buttons
 *   and edge fades,
 * - auto-scrolls when something is dragged near an edge (drag-to-reorder).
 */
export function useHorizontalScroll(ref: RefObject<HTMLElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < max - 1);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      // Let real horizontal gestures (trackpad, Shift+wheel, tilt wheel) through untouched.
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const delta = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaMode === 2 ? event.deltaY * el.clientWidth : event.deltaY;
      const atStart = el.scrollLeft <= 0 && delta < 0;
      const atEnd = el.scrollLeft >= max - 1 && delta > 0;
      if (atStart || atEnd) return; // hand the wheel back to the page
      event.preventDefault();
      el.scrollLeft += delta;
    };

    update();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(el);
    for (const child of Array.from(el.children)) resize.observe(child);
    const mutations = new MutationObserver(() => {
      for (const child of Array.from(el.children)) resize.observe(child);
      update();
    });
    mutations.observe(el, { childList: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", update);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [ref, update]);

  /** Scroll by most of the visible width. */
  const scrollByPage = useCallback((direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.75, 160), behavior: "smooth" });
  }, [ref]);

  /** Attach to onDragOver of the row: scrolls when a dragged item nears an edge. */
  const onDragOverEdge = useCallback((event: DragEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const zone = Math.min(64, rect.width / 4);
    if (event.clientX < rect.left + zone) el.scrollLeft -= 12;
    else if (event.clientX > rect.right - zone) el.scrollLeft += 12;
  }, [ref]);

  return { canScrollLeft, canScrollRight, scrollByPage, onDragOverEdge };
}
