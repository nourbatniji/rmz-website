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
    { kind: "text", name: "tagline", label: "Description under the headline", help: "Shown inside the picture, under the banner headline, on all three banners. Empty = \"Strategy, identity, campaigns & digital experiences.\"" },
    { kind: "text", name: "ctaLabel", label: "Link text", help: "The link under the description. Empty = \"Explore our work\"." },
    { kind: "text", name: "ctaHref", label: "Link target", help: "#work for a section, /path for a page, https://… for another site. Empty = #work." },
    {
      kind: "list",
      name: "banners",
      label: "Banners",
      help: "The three faces of the picture. Each has its own headline, chip, colour and images.",
      fixed: true,
      fixedOrder: true,
      min: 1,
      title: (it, i) => `${str(it, "number", String(i + 1))} · ${str(it, "label", "Banner")}`,
      item: [
        { kind: "text", name: "phraseLead", label: "Headline — bold cream line", help: "Large line in the picture, e.g. A DIFFERENT" },
        { kind: "text", name: "phraseEmphasis", label: "Headline — red italic line", help: "Italic line under it, e.g. perspective. Both lines are needed, or the fallback headline below is used." },
        { kind: "text", name: "label", label: "Chip label", help: "The selector chip at the bottom-left of the picture." },
        { kind: "color", name: "accent", label: "Chip colour" },
        { kind: "image", name: "poster", label: "Poster (first frame)", help: "Shown immediately and as the fallback if the sequence is missing." },
        { kind: "sequence", name: "sequence", label: "Image sequence", help: "The frames that play as the picture turns and the page scrolls." },
        { kind: "text", name: "description", label: "Description for screen readers", multiline: true, rows: 2, help: "Not visible on the page." },
      ],
    },
    headline("Fallback headline (not normally shown)"),
    { kind: "text", name: "intro", label: "Intro paragraph (not shown on the page)", multiline: true, rows: 3, help: "Kept for the content record; the Top banner no longer displays it." },
    { kind: "text", name: "scrollHint", label: "Scroll hint (not shown on the page)", help: "Kept for the content record; the Top banner no longer displays it." },
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
  collaborations: [
    { kind: "toggle", name: "visible", label: "Show this section on the website", onLabel: "Shown", offLabel: "Hidden" },
    {
      kind: "group",
      label: "Heading",
      fields: [
        { kind: "text", name: "label", label: "Small label above the heading" },
        { kind: "text", name: "headingLead", label: "Heading — first part" },
        { kind: "text", name: "headingEmphasis", label: "Heading — red italic part" },
      ],
    },
    {
      kind: "group",
      name: "magnet",
      label: "Central RMZ square",
      help: "The red square people move, tap or press. Uploading artwork replaces the default RMZ lettering; every behaviour stays the same.",
      fields: [
        { kind: "image", name: "artwork", label: "Artwork", noAlt: true, help: "Optional. SVG or PNG with a transparent background works best. Leave empty to keep the RMZ lettering." },
        { kind: "text", name: "label", label: "Accessible label", help: "Announced by screen readers for the square, e.g. “RMZ — gather the collaborations”." },
        { kind: "range", name: "artworkScale", label: "Artwork size inside the square", min: 30, max: 100, unit: "%", def: 100, preview: "magnet" },
        { kind: "color", name: "background", label: "Square colour", help: "Default #D52518 (RMZ red)." },
        { kind: "color", name: "artworkColor", label: "Lettering colour", help: "Colours the default RMZ lettering. Uploaded artwork keeps its own colours unless “Paint artwork in one colour” is on." },
        {
          kind: "toggle",
          name: "tint",
          label: "Paint uploaded artwork in one colour",
          onLabel: "Single colour (uses the lettering colour)",
          offLabel: "Keep original colours",
          help: "Only suits single-colour artwork with a transparent background: its shape is filled with the colour above. Multicolour or photographic artwork should stay on “Keep original colours”.",
        },
      ],
    },
    {
      kind: "list",
      name: "partners",
      label: "Partner logos",
      help: "Drag to reorder, or use the arrows. Hidden logos stay here but are left off the website. The arrangement is calculated automatically from the visible logos; with many logos the section grows taller.",
      max: 60,
      hideKey: "visible",
      thumb: (it) => (it.logo && typeof (it.logo as Obj).src === "string" ? ((it.logo as Obj).src as string) : null),
      title: (it) => str(it, "name", "Logo"),
      blank: () => ({ id: `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: "New partner", alt: "", logo: null, mark: null, href: null, visible: true, scale: 100 }),
      item: [
        { kind: "image", name: "logo", label: "Logo artwork", noAlt: true, help: "SVG or PNG with a transparent background. Proportions and transparency are kept. Without artwork the website shows the name as text." },
        { kind: "text", name: "name", label: "Name" },
        { kind: "text", name: "alt", label: "Accessible alternative text", help: "Describe the logo for screen readers, e.g. “Northwind logo”. If empty, the name is used." },
        { kind: "text", name: "href", label: "Destination link (optional)", nullable: true, placeholder: "https://…", help: "When set, the logo is a real link. Leave empty for a plain logo." },
        { kind: "toggle", name: "visible", label: "Show on the website", onLabel: "Shown", offLabel: "Hidden" },
        { kind: "range", name: "scale", label: "Visual size", min: 50, max: 160, unit: "%", def: 100, preview: "partner", help: "Relative to the automatic size that balances all logos. The layout keeps logos apart whatever you choose." },
      ],
    },
  ],
  contact: [
    {
      kind: "group",
      label: "Heading",
      fields: [
        { kind: "text", name: "kicker", label: "Small label above the heading", help: "Default: Start a project." },
        { kind: "text", name: "headingLead", label: "Heading: first part" },
        { kind: "text", name: "headingEmphasis", label: "Heading: italic part" },
      ],
    },
    {
      kind: "group",
      label: "Form fields",
      fields: [
        { kind: "text", name: "nameLabel", label: "Name: label" },
        { kind: "text", name: "nameHint", label: "Name: hint under the field" },
        { kind: "text", name: "emailLabel", label: "Email: label" },
        { kind: "text", name: "emailHint", label: "Email: hint under the field" },
        { kind: "text", name: "emailError", label: "Email: message when it is missing or invalid" },
        { kind: "text", name: "companyLabel", label: "Company: label" },
        { kind: "text", name: "companyOptional", label: "Company: small tag", help: "Shown next to the label, e.g. optional." },
        { kind: "text", name: "messageLabel", label: "Message: label" },
        { kind: "text", name: "messageHint", label: "Message: hint under the field" },
      ],
    },
    {
      kind: "group",
      label: "Button and messages",
      fields: [
        { kind: "text", name: "buttonLabel", label: "Send button" },
        { kind: "text", name: "sendingLabel", label: "Button while sending" },
        { kind: "text", name: "sentLabel", label: "Button after it was sent" },
      ],
    },
    {
      kind: "group",
      label: "Email link under the form",
      fields: [
        { kind: "text", name: "mailPrefix", label: "Text before the address", help: "Default: or write." },
        { kind: "text", name: "email", label: "Email address", help: "Shown under the form and used for the mailto link." },
      ],
    },
  ],
  footer: [
    {
      kind: "group",
      label: "Top line",
      fields: [
        { kind: "text", name: "label", label: "Label, top left", help: "Default: Contact." },
        { kind: "text", name: "place", label: "Place, top centre", help: "Shown with the live local time, e.g. Cairo, Egypt." },
        { kind: "text", name: "timeZone", label: "Time zone for the clock", help: "e.g. Africa/Cairo." },
      ],
    },
    {
      kind: "group",
      name: "studio",
      label: "Studio text",
      fields: [{ kind: "text", name: "body", label: "Text", multiline: true, rows: 3 }],
    },
    { kind: "text", name: "email", label: "Email address", help: "Shown in the footer and used for the mailto link." },
    {
      kind: "group",
      name: "explore",
      label: "Explore column",
      fields: [
        { kind: "text", name: "heading", label: "Column heading" },
        {
          kind: "list",
          name: "links",
          label: "Links",
          help: "Drag to reorder, or use the arrows.",
          min: 1,
          max: 8,
          title: (it) => str(it, "label", "Link"),
          blank: () => ({ label: "New link", href: "#" }),
          item: [
            { kind: "text", name: "label", label: "Link text" },
            { kind: "text", name: "href", label: "Link to", placeholder: "#work, /page, https://… or mailto:…" },
          ],
        },
      ],
    },
    {
      kind: "group",
      name: "services",
      label: "What we do column",
      fields: [
        { kind: "text", name: "heading", label: "Column heading" },
        { kind: "strings", name: "items", label: "Services", min: 1, max: 8, help: "One service per line." },
      ],
    },
    {
      kind: "group",
      name: "elsewhere",
      label: "Elsewhere column",
      fields: [
        { kind: "text", name: "heading", label: "Column heading" },
        {
          kind: "list",
          name: "links",
          label: "Links",
          help: "Social and external links.",
          min: 1,
          max: 8,
          title: (it) => str(it, "label", "Link"),
          blank: () => ({ label: "New link", href: "#" }),
          item: [
            { kind: "text", name: "label", label: "Link text" },
            { kind: "text", name: "href", label: "Link to", placeholder: "#work, /page, https://… or mailto:…" },
          ],
        },
      ],
    },
    {
      kind: "group",
      label: "Bottom line",
      fields: [
        { kind: "text", name: "copyright", label: "Copyright line" },
        { kind: "text", name: "placeholderNote", label: "Note, bottom right", help: "Small line under the Elsewhere column." },
        { kind: "text", name: "toTop", label: "Back-to-top text" },
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
