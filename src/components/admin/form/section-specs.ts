import { COPY_STATUS_FULL, type Field, type Obj } from "./spec";
import type { SectionKey } from "@/lib/admin/section-meta";

const SERVICE_IDS = ["branding", "creative-strategy", "content-production", "social-media", "design", "paid-media", "web-experiences"];
const MIND_IDS = Array.from({ length: 8 }, (_, i) => `mind-0${i + 1}`);
const cs = (values: string[]) => COPY_STATUS_FULL.filter((o) => values.includes(o.value));

const headline = (label = "Headline"): Field => ({
  kind: "group",
  name: "headline",
  label,
  fields: [
    { kind: "text", name: "lead", label: "First line" },
    { kind: "text", name: "emphasis", label: "Italic yellow line", help: "Shown in the italic accent style." },
  ],
});

const str = (o: Obj, k: string, fallback: string) => (typeof o[k] === "string" && o[k] ? (o[k] as string) : fallback);

/** Form layout for every editable section. Layout, animation and design tokens stay in code. */
export const SECTION_FIELDS: Record<SectionKey, Field[]> = {
  site: [
    {
      kind: "group",
      name: "brand",
      label: "Brand",
      fields: [
        { kind: "text", name: "name", label: "Brand name" },
        { kind: "image", name: "logo", label: "Logo", help: "SVG preferred. Without a logo the header shows the name as text." },
      ],
    },
    {
      kind: "list",
      name: "nav",
      label: "Header links",
      min: 1,
      max: 6,
      title: (it) => str(it, "label", "Link"),
      blank: () => ({ label: "New link", href: "#" }),
      item: [
        { kind: "text", name: "label", label: "Label" },
        { kind: "text", name: "href", label: "Link", help: "#services for a section, /path for a page, https://… for another site." },
      ],
    },
  ],
  hero: [
    headline(),
    { kind: "text", name: "intro", label: "Intro paragraph", multiline: true, rows: 3 },
    { kind: "text", name: "scrollHint", label: "Scroll hint" },
    {
      kind: "list",
      name: "banners",
      label: "Banners",
      fixed: true,
      fixedOrder: true,
      min: 1,
      title: (it, i) => `${str(it, "number", String(i + 1))} · ${str(it, "label", "Banner")}`,
      item: [
        { kind: "text", name: "label", label: "Chip label" },
        { kind: "color", name: "accent", label: "Chip colour" },
        { kind: "text", name: "description", label: "Description for screen readers", multiline: true, rows: 2 },
        { kind: "image", name: "poster", label: "Poster (first frame)", help: "Shown immediately and as the fallback." },
        { kind: "sequence", name: "sequence", label: "Image sequence" },
      ],
    },
  ],
  corridor: [
    { kind: "text", name: "kicker", label: "Kicker" },
    headline("Approach headline"),
    { kind: "text", name: "intro", label: "Approach paragraph", multiline: true, rows: 3 },
    { kind: "text", name: "arrivalHeadline", label: "Arrival headline", help: "Shown above the video once the walk ends." },
    { kind: "text", name: "arrivalDescription", label: "Arrival paragraph", multiline: true, rows: 3 },
    { kind: "video", name: "video", label: "Showreel video", help: "One 2.4:1 master (e.g. 3840 × 1600) fills all three walls. Other ratios are centre-cropped." },
    { kind: "image", name: "poster", label: "Poster still (2.4:1)" },
    { kind: "text", name: "accessibleDescription", label: "Describe the film for screen readers", multiline: true, rows: 3 },
  ],
  statement: [
    { kind: "strings", name: "lead", label: "First line (fixed words)", placeholder: "RMZ,", help: "Words shown on the first line, in order." },
    { kind: "strings", name: "connector", label: "Words before the rotating word", placeholder: "are" },
    { kind: "strings", name: "words", label: "Rotating words", min: 2, max: 10, placeholder: "broken", help: "The last word swaps through this list." },
  ],
  featured: [
    { kind: "text", name: "label", label: "Section label" },
    {
      kind: "list",
      name: "items",
      label: "Cards",
      min: 3,
      max: 12,
      title: (it) => `${str(it, "number", "··")} · ${str(it, "name", "Card")}`,
      blank: () => ({
        id: `work-${Date.now().toString(36)}`,
        number: "00",
        name: "New project",
        category: "Brand identity",
        description: "Placeholder: two or three sentences on the brief, the idea and the result.",
        copyStatus: "placeholder",
        image: null,
        imagePosition: "50% 50%",
        placeholderColor: "#F86015",
      }),
      item: [
        { kind: "text", name: "number", label: "Number label", help: "Two digits, e.g. 01. Renumber after reordering." },
        { kind: "text", name: "name", label: "Project name" },
        { kind: "text", name: "category", label: "Category line" },
        { kind: "text", name: "description", label: "Back-face description", multiline: true, rows: 4, help: "Keep it short: about five lines fit." },
        { kind: "select", name: "copyStatus", label: "Copy status", options: cs(["approved", "placeholder"]) },
        { kind: "image", name: "image", label: "Front image" },
        { kind: "text", name: "imagePosition", label: "Image crop focus", placeholder: "50% 50%", help: "x% y% — which part of the image stays visible when cropped." },
        { kind: "color", name: "placeholderColor", label: "Placeholder colour", help: "Only used while there is no image." },
      ],
    },
  ],
  services: [
    {
      kind: "list",
      name: "items",
      label: "Services",
      fixed: true,
      title: (it, i) => `${i + 1} · ${str(it, "name", "Service")}`,
      item: [
        { kind: "text", name: "id", label: "Id (fixed)", readOnly: true, help: "Other content refers to this id, so it cannot change." },
        { kind: "text", name: "name", label: "Name" },
      ],
    },
  ],
  lens: [
    { kind: "text", name: "kicker", label: "Kicker" },
    {
      kind: "group",
      name: "heading",
      label: "Heading",
      fields: [
        { kind: "text", name: "lead", label: "First part" },
        { kind: "text", name: "emphasis", label: "Italic part" },
      ],
    },
    { kind: "text", name: "intro", label: "Intro", multiline: true, rows: 3 },
    { kind: "text", name: "hintDesktop", label: "Hint (desktop)" },
    { kind: "text", name: "hintMobile", label: "Hint (mobile)" },
    { kind: "select", name: "initialSelectedId", label: "Service selected on load", options: SERVICE_IDS.map((v) => ({ value: v, label: v })) },
    {
      kind: "list",
      name: "items",
      label: "Services",
      fixed: true,
      fixedOrder: true,
      title: (it) => `${str(it, "focal", "")} · ${str(it, "serviceId", "service")}`,
      item: [
        { kind: "text", name: "serviceId", label: "Service (fixed)", readOnly: true },
        { kind: "text", name: "focal", label: "Focal label", placeholder: "24mm" },
        { kind: "text", name: "ringMark", label: "Ring mark", placeholder: "24" },
        { kind: "text", name: "description", label: "Description", multiline: true, rows: 3 },
        { kind: "strings", name: "details", label: "Three bullet points", fixed: true },
        {
          kind: "select",
          name: "scene",
          label: "Scene drawn in the lens",
          options: [
            { value: "detail", label: "Detail" },
            { value: "triptych", label: "Triptych" },
            { value: "contactsheet", label: "Contact sheet" },
            { value: "collage", label: "Collage" },
            { value: "fullframe", label: "Full frame" },
            { value: "reach", label: "Reach" },
            { value: "devices", label: "Devices" },
          ],
        },
        { kind: "text", name: "href", label: "Service page link", nullable: true, help: "Leave empty until a service page exists; the “Explore service” link is then hidden." },
        { kind: "select", name: "copyStatus", label: "Copy status", options: cs(["approved", "provisional"]) },
      ],
    },
    {
      kind: "group",
      name: "images",
      label: "Scene images",
      help: "Nine image slots used by the lens scenes. Empty slots show a labelled placeholder.",
      fields: "abcdefghi".split("").map((k) => ({ kind: "image", name: k, label: `Slot ${k.toUpperCase()}` }) as Field),
    },
  ],
  minds: [
    { kind: "text", name: "label", label: "Accessible heading", help: "Hidden visually, read by screen readers." },
    { kind: "select", name: "initialOpenId", label: "Column open on load", options: MIND_IDS.map((v, i) => ({ value: v, label: `Mind 0${i + 1}` })) },
    {
      kind: "list",
      name: "items",
      label: "Minds",
      fixed: true,
      title: (it, i) => `${str(it, "number", String(i + 1))} · ${str(it, "name", "Mind")}`,
      item: [
        { kind: "text", name: "name", label: "Name" },
        { kind: "text", name: "role", label: "Role" },
        { kind: "text", name: "bio", label: "Short biography", multiline: true, rows: 4 },
        { kind: "select", name: "copyStatus", label: "Copy status", options: cs(["approved", "placeholder"]) },
        { kind: "image", name: "image", label: "Portrait", help: "At least 1040 × 760." },
        { kind: "text", name: "imagePosition", label: "Portrait crop focus", placeholder: "50% 30%" },
      ],
    },
  ],
  workIntro: [
    { kind: "text", name: "label", label: "Section label" },
    { kind: "text", name: "headingLead", label: "Heading: first part" },
    { kind: "text", name: "headingEmphasis", label: "Heading: italic part" },
    { kind: "text", name: "intro", label: "Intro", multiline: true, rows: 3 },
    {
      kind: "list",
      name: "categories",
      label: "Filters",
      fixed: true,
      fixedOrder: true,
      title: (it) => str(it, "label", "Filter"),
      item: [{ kind: "text", name: "label", label: "Label" }],
    },
    { kind: "text", name: "emptyTitle", label: "Empty-state title" },
    { kind: "text", name: "emptyBody", label: "Empty-state text", multiline: true, rows: 2 },
    {
      kind: "group",
      name: "contact",
      label: "Contact link",
      fields: [
        { kind: "text", name: "label", label: "Label" },
        { kind: "text", name: "href", label: "Link" },
      ],
    },
  ],
};

export const PROJECT_CATEGORIES = [
  { value: "brand", label: "Brand identity" },
  { value: "camp", label: "Campaign" },
  { value: "dig", label: "Digital" },
  { value: "cont", label: "Content and production" },
];

export const PROJECT_FIELDS: Field[] = [
  { kind: "text", name: "discipline", label: "Discipline label", placeholder: "Brand identity", help: "Shown under the project name." },
  { kind: "text", name: "year", label: "Year", placeholder: "2026" },
  { kind: "text", name: "client", label: "Client", nullable: true, help: "Leave empty if not supplied yet." },
  { kind: "image", name: "image", label: "Hero image", help: "21:10 works best." },
  { kind: "strings", name: "palette", label: "Palette (ground, deep, signal, ink)", fixed: true, color: true },
  { kind: "text", name: "about", label: "Summary", multiline: true, rows: 3, help: "Shown on the archive card and in search results." },
  { kind: "text", name: "services", label: "Services line", placeholder: "Identity, typography, guidelines" },
  { kind: "text", name: "brief", label: "Brief", multiline: true, rows: 4 },
  { kind: "text", name: "idea", label: "Idea", multiline: true, rows: 2 },
  { kind: "strings", name: "keys", label: "Key points", placeholder: "One mark that survives every scale" },
  { kind: "strings", name: "deliverables", label: "Deliverables", placeholder: "Logo system and usage rules" },
  {
    kind: "list",
    name: "credits",
    label: "Credits",
    title: (it) => str(it, "role", "Credit"),
    blank: () => ({ role: "Role", name: null }),
    item: [
      { kind: "text", name: "role", label: "Role" },
      { kind: "text", name: "name", label: "Name", nullable: true, help: "Leave empty if not supplied yet." },
    ],
  },
  { kind: "select", name: "copyStatus", label: "Copy status", options: cs(["approved", "placeholder"]).map((o) => (o.value === "placeholder" ? { value: "placeholder", label: "Placeholder (demo copy)" } : o)) },
];
