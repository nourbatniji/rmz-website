import type { SectionState } from "@/lib/admin/section-status";
import type { Tone } from "./ui";

/** One place that decides how a section's state is worded, so Overview, Website and the sidebar agree. */
export function sectionPill(s: SectionState): { tone: Tone; text: string } {
  if (s.invalid) return { tone: "bad", text: "Needs fixing" };
  if (s.fromDefault) return { tone: "neutral", text: "Original content" };
  if (s.draftChanges) return { tone: "warn", text: s.published ? "Unpublished changes" : "Not published" };
  return { tone: "ok", text: "Published" };
}

export function needsList(s: SectionState): string[] {
  return [s.placeholders && `${s.placeholders} placeholder text${s.placeholders === 1 ? "" : "s"}`, s.provisional && `${s.provisional} provisional`, s.missingMedia && `${s.missingMedia} missing image${s.missingMedia === 1 ? "" : "s"}/video`].filter(Boolean) as string[];
}
