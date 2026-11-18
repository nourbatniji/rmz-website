/**
 * TEMPORARY. Stands in for the homepage sections that are not built yet so the page has real scroll
 * distance (global scroll progress drives the hero frames). Remove as the real sections land.
 */
export function DevScrollSpacer() {
  return (
    <div aria-hidden="true">
      {["Showreel", "Statement", "Selected work"].map((l, i) => (
        <div key={l} className="flex h-svh items-end border-t border-cream/10 px-(--gutter) pb-10" style={{ background: i % 2 ? "#141412" : "#0F0F0E" }}>
          <p className="t-meta text-[11px] text-cream/40">Upcoming section · {l}</p>
        </div>
      ))}
    </div>
  );
}
