import type { FooterLink } from "@/content/closing-types";

/** A social destination is shown only once it is a real profile address: not empty, and not just the network's front page (the old development placeholders). */
const FRONT_PAGE = /^https?:\/\/(www\.)?(instagram|behance|dribbble|pinterest|linkedin|tiktok|facebook|x|twitter|youtube)\.com\/?$/i;
export const realSocial = (links: FooterLink[]) => links.filter((l) => l.href.trim() !== "" && !FRONT_PAGE.test(l.href.trim()));

/** What the Elsewhere column lists: every link, so the column always shows all of them (an empty address renders as plain text). */
export const elsewhereLinks = (links: FooterLink[]) => links.filter((l) => l.label.trim() !== "");
