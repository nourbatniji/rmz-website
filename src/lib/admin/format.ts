/** Date helpers that give the same text on the server and in the browser (fixed locale and zone). */
const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
export const fmtDate = (d: Date | string | null | undefined) => (d ? DATE.format(new Date(d)) : "—");

export function fmtAgo(d: Date | string | null | undefined, now = Date.now()): string {
  if (!d) return "never";
  const mins = Math.round((now - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  if (mins < 60 * 24 * 14) return `${Math.round(mins / 60 / 24)} days ago`;
  return fmtDate(d);
}
