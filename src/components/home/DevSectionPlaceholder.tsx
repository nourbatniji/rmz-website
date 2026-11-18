/**
 * TEMPORARY, development-only marker for homepage sections that are not built yet. Keeps the approved
 * section ORDER visible without large artificial gaps. Remove each as its real section lands.
 */
export function DevSectionPlaceholder({ label, id }: { label: string; id?: string }) {
  return (
    <div
      id={id}
      aria-hidden="true"
      className="flex h-28 items-center border-t border-cream/10 bg-ink px-(--gutter)"
    >
      <p className="t-meta text-[11px] text-cream/40">Upcoming section · {label} · not built yet</p>
    </div>
  );
}
