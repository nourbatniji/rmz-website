import type { WorkCategory, WorkContent, WorkProject } from "../work-types";

/**
 * Development content for the Work section. EVERYTHING here is demo content taken from the approved canvas
 * (WorkB3 archive + WorkA project page): project names, categories, copy, palettes. No real clients, credits or
 * results have been supplied. See docs/work-section.md.
 */

type CategoryCopy = Pick<WorkProject, "about" | "services" | "brief" | "idea" | "keys" | "deliverables">;

const COPY: Record<WorkCategory, CategoryCopy> = {
  brand: {
    about: "Demo copy: a full identity system, from name treatment and typography to palette and everyday applications.",
    services: "Identity, typography, guidelines",
    brief: "Demo copy. A young company with a sharp product and no visual voice needed an identity that could carry across packaging, screens and film.",
    idea: "An identity that behaves like a sound, not a sign.",
    keys: ["One mark that survives every scale", "A palette taken from the product, not the category", "Type that speaks in the brand’s own tone"],
    deliverables: ["Logo system and usage rules", "Typography and palette", "Packaging and print applications", "Social and motion templates", "Brand guidelines"],
  },
  camp: {
    about: "Demo copy: a campaign idea turned into key visuals, a short film and supporting executions.",
    services: "Campaign idea, art direction, film",
    brief: "Demo copy. A launch needed attention in a crowded week, with a small budget and a fixed date.",
    idea: "Make the product the loudest thing in the room.",
    keys: ["One line that works in every format", "Key visuals built for the feed and the street", "A film cut into reels and stills"],
    deliverables: ["Campaign idea and line", "Key visuals", "Hero film and reels", "Social and out-of-home executions"],
  },
  dig: {
    about: "Demo copy: a website designed and built around a product story, with considered responsive layouts.",
    services: "UX, interface design, front-end",
    brief: "Demo copy. The product was strong but the site explained it slowly, and mobile visitors left early.",
    idea: "Let the product lead and the interface get out of the way.",
    keys: ["One story per screen", "Motion only where it explains", "Layouts that recompose, not shrink"],
    deliverables: ["Site architecture", "Desktop and mobile designs", "Interaction prototypes", "Front-end build"],
  },
  cont: {
    about: "Demo copy: a production sprint covering film, photography and short-form content.",
    services: "Direction, production, post",
    brief: "Demo copy. A brand needed a month of content shot in two days, in one consistent voice.",
    idea: "Shoot once, cut for every screen.",
    keys: ["A shot list built from the edit", "One look across film and stills", "Formats planned before the camera rolls"],
    deliverables: ["Hero film", "Photography set", "Short-form cut-downs", "Asset library"],
  },
};

const DISCIPLINE: Record<WorkCategory, string> = {
  brand: "Brand identity",
  camp: "Campaign",
  dig: "Digital experience",
  cont: "Content & production",
};

const PALETTES: WorkProject["palette"][] = [
  ["#E9DFC8", "#1F3B2E", "#F86015", "#0F0F0E"],
  ["#FFCA26", "#6B1E12", "#F3E8CC", "#0F0F0E"],
  ["#0F2A44", "#5B8FB9", "#FFCA26", "#F3E8CC"],
  ["#2B1B3F", "#D52518", "#F3E8CC", "#FFCA26"],
  ["#9ACC42", "#173A2B", "#F3E8CC", "#0F0F0E"],
  ["#F3C9B8", "#7A2E2A", "#0F0F0E", "#FFCA26"],
  ["#14181F", "#3B4A63", "#9ACC42", "#F3E8CC"],
  ["#CFA46B", "#3A2416", "#F86015", "#F3E8CC"],
  ["#E7E1F0", "#3C2C7A", "#FFCA26", "#0F0F0E"],
  ["#F86015", "#1A1A1A", "#FFCA26", "#F3E8CC"],
];

const ROWS: [string, WorkCategory, string][] = [
  ["Alpha", "brand", "2026"],
  ["Beta", "camp", "2026"],
  ["Gamma", "dig", "2025"],
  ["Delta", "cont", "2025"],
  ["Epsilon", "camp", "2025"],
  ["Zeta", "brand", "2025"],
  ["Eta", "dig", "2024"],
  ["Theta", "cont", "2024"],
  ["Iota", "brand", "2024"],
  ["Kappa", "camp", "2024"],
];

const CREDIT_ROLES = ["Creative direction", "Art direction", "Design", "Production"];

const projects: WorkProject[] = ROWS.map(([name, category, year], i) => ({
  slug: name.toLowerCase(),
  number: String(i + 1).padStart(2, "0"),
  name,
  category,
  discipline: DISCIPLINE[category],
  year,
  client: null,
  palette: PALETTES[i],
  image: null,
  ...COPY[category],
  credits: CREDIT_ROLES.map((role) => ({ role, name: null })),
  copyStatus: "placeholder",
}));

export const devWorkContent: WorkContent = {
  label: "Work · Spatial collection",
  headingLead: "Selected",
  headingEmphasis: "work.",
  intro: "Walk the collection one project at a time, or jump straight from the index. Demo projects stand in for the verified portfolio.",
  categories: [
    { id: "all", label: "All" },
    { id: "brand", label: "Branding & Identity" },
    { id: "camp", label: "Campaigns" },
    { id: "dig", label: "Digital" },
    { id: "cont", label: "Content & Production" },
  ],
  emptyTitle: "Nothing here yet.",
  emptyBody: "No projects have been published yet. Tell us about yours.",
  contact: { label: "Start a project", href: "mailto:management@rmz.solutions" },
  projects,
};
