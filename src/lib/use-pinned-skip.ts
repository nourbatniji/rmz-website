/**
 * Pointer hit-test for the work cards: "on the cards" means over the union of the visible cards' boxes (+ pad), or over anything interactive.
 * The wheel only steps cards there (see use-wheel-steps.ts); anywhere else the page scrolls normally.
 */
/** Union of the visible cards' boxes (+ pad), plus anything interactive under the pointer, counts as "on the cards". */
export function pointerOverCards(e: WheelEvent, cards: Iterable<HTMLElement>, extra?: HTMLElement | null, pad = 24, scope?: HTMLElement | null) {
  const t = e.target as Element | null;
  if (t?.closest?.("button, a, input") && (!scope || scope.contains(t))) return true; // controls count only inside the card stage (not the header or filter chips)
  let l = Infinity, r = -Infinity, tp = Infinity, b = -Infinity;
  for (const c of cards) {
    const cs = getComputedStyle(c);
    if (cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.05) continue;
    const q = c.getBoundingClientRect();
    l = Math.min(l, q.left); r = Math.max(r, q.right); tp = Math.min(tp, q.top); b = Math.max(b, q.bottom);
  }
  if (extra) b = Math.max(b, extra.getBoundingClientRect().bottom);
  return e.clientX >= l - pad && e.clientX <= r + pad && e.clientY >= tp - pad && e.clientY <= b + pad;
}
