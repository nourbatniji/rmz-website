import type { Metadata } from "next";
import { LogoAnimationLab } from "@/components/lab-logo/LogoAnimationLab";

/**
 * Lab: the RMZ logo animation as an isolated prototype (Replay + timeline scrubber).
 * Deliberately OUTSIDE the (site) route group so the production header is not rendered here. Not linked, not indexed.
 * It is not wired to the homepage or to any loader.
 */
export const metadata: Metadata = { title: "RMZ — LOGO ANIMATION LAB", robots: { index: false, follow: false } };

export default function Page() {
  return <LogoAnimationLab />;
}
