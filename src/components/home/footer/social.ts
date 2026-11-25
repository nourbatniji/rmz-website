import type { FooterLink } from "@/content/closing-types";

/** A social destination is shown only once it is a real profile address: not empty, and not just the network's front page (the old development placeholders). */
const FRONT_PAGE = /^https?:\/\/(www\.)?(instagram|behance|linkedin|tiktok|facebook|x|twitter|youtube)\.com\/?$/i;
export const realSocial = (links: FooterLink[]) => links.filter((l) => l.href.trim() !== "" && !FRONT_PAGE.test(l.href.trim()));
