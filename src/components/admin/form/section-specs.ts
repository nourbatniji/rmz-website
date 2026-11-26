import { COPY_STATUS_FULL, type Field, type Obj } from "./spec";
import type { SectionKey } from "@/lib/admin/section-meta";
import { CALIBRATION_OVERVIEW, CALIBRATION_VIEWS, FALLBACK_VIEW, WORLD_ZOOM } from "@/content/lens-world-defaults";

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
      help: "The link named Contact (or, if there is none, the last one) is shown as the button on the right of the header; the others sit in the centre and in the menu.",
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
  // Hero: only what HeroThreeWorlds actually renders. Not shown (kept untouched in the saved content): `headline` (old fallback if a banner has no headline pair), `intro` and `scrollHint`
  // (no longer displayed), and each banner's `number` (only used by the empty-artwork placeholder).
  hero: [
    {
      kind: "group",
      label: "Shared by all banners",
      help: "Appears inside the picture, under the headline of whichever banner is showing.",
      fields: [
        { kind: "text", name: "tagline", label: "Tagline (under the headline)", multiline: true, rows: 2 },
        { kind: "text", name: "ctaLabel", label: "Link text", help: "The link under the tagline." },
        { kind: "text", name: "ctaHref", label: "Link target", help: "#work for a section, /path for a page, https://… for another site." },
      ],
    },
    {
      kind: "list",
      name: "banners",
      label: "Banners (in homepage order)",
      help: "Banner 1 is the first one visitors see. Its poster is also the picture inside the word of the opening animation. Open a banner to see it in the preview.",
      fixed: true,
      fixedOrder: true,
      min: 1,
      thumb: (it) => (it.poster && typeof (it.poster as Obj).src === "string" ? ((it.poster as Obj).src as string) : null),
      title: (it, i) => `Banner ${i + 1} · ${str(it, "phraseEmphasis", str(it, "label", "Banner"))}`,
      item: [
        {
          kind: "group",
          label: "Headline",
          fields: [
            { kind: "text", name: "phraseLead", label: "First line (bold, cream)", help: "e.g. A DIFFERENT" },
            { kind: "text", name: "phraseEmphasis", label: "Second line (red italic)", help: "e.g. perspective." },
          ],
        },
        {
          kind: "group",
          label: "Selector",
          fields: [
            { kind: "text", name: "label", label: "Selector label", help: "The word at the bottom-left that switches to this banner, e.g. Identity." },
            { kind: "color", name: "accent", label: "Selector underline colour" },
          ],
        },
        {
          kind: "group",
          label: "Artwork",
          fields: [
            { kind: "image", name: "poster", label: "Poster (first frame)", help: "Shown immediately and as the fallback. For banner 1 it is also the image inside the opening animation." },
            { kind: "sequence", name: "sequence", label: "Image sequence", help: "The frames that play as the page scrolls (forwards and in reverse)." },
          ],
        },
        { kind: "text", name: "description", label: "Description for screen readers", multiline: true, rows: 2, help: "Not visible. Describe what the artwork shows." },
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
    { kind: "text", name: "label", label: "Section label", help: "Shown above the steps and used as the section's accessible heading." },
    {
      kind: "list",
      name: "items",
      label: "About steps",
      help: "The steps of the scroll-linked About Us section, in order. Each step has a title, a heading, a description and an image.",
      min: 3,
      max: 12,
      title: (it) => `${str(it, "number", "··")} · ${str(it, "name", "Step")}`,
      blank: () => ({
        id: `about-${Date.now().toString(36)}`,
        number: "00",
        name: "New step",
        category: "",
        description: "Two or three sentences about the studio.",
        copyStatus: "approved",
        image: null,
        imagePosition: "50% 50%",
        placeholderColor: "#F86015",
      }),
      item: [
        { kind: "text", name: "number", label: "Step number", help: "Two digits, e.g. 01. Renumber after reordering." },
        { kind: "text", name: "name", label: "Heading", help: "The large heading of the step. It is also the title in the step list on the left." },
        { kind: "text", name: "description", label: "Description", multiline: true, rows: 4, help: "Two or three short sentences about the studio." },
        { kind: "image", name: "image", label: "Image", help: "Upload a new image or choose one from the media library. Add alt text for screen readers." },
        { kind: "text", name: "imagePosition", label: "Image crop focus", placeholder: "50% 50%", help: "x% y% — which part of the image stays visible when cropped." },
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
    {
      kind: "image",
      name: "overview",
      label: "Overview image (all seven services)",
      noAlt: true,
      help: "ONE image that shows all seven services together. The lens opens on it and returns to it between services. Square, about 3200 × 3200 px, works best.",
    },
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
          kind: "group",
          name: "world",
          label: "Image in the shared world",
          help: "How the lens arrives at this service: it zooms into the overview at the target point, then shows this service's own image.",
          fallback: (it, root) => {
            const v = CALIBRATION_VIEWS[String(it.serviceId)] ?? FALLBACK_VIEW;
            return { ...v, image: (root.overview as Obj | null | undefined)?.src ? null : v.image } as Obj;
          },
          fields: [
            { kind: "image", name: "image", label: "Service image", noAlt: true, help: "Shown full size once the lens has zoomed in. It must show the same scene as the highlighted window on the overview, only in more detail. Square works best." },
            { kind: "range", name: "zoom", label: "Zoom into the overview", min: WORLD_ZOOM.min, max: WORLD_ZOOM.max, step: 0.01, unit: "×", def: 3, help: "How far the lens zooms in before showing the service image. Higher = a smaller part of the overview. 1× shows the whole overview (use it when the service image is the full overview)." },
            { kind: "point", name: "target", role: "target", zoomKey: "zoom", label: "Target on the overview", help: "Click the overview where this service lives. The yellow frame is what the lens will show at the chosen zoom.", image: (root) => (root.overview as Obj | null | undefined)?.src as string | undefined ?? CALIBRATION_OVERVIEW.src },
            { kind: "point", name: "focal", role: "focal", label: "Focal point of the service image", help: "Only used if the image is not square: the part that stays visible when it is cropped.", image: (_root, local) => ((local.image as Obj | null | undefined)?.src as string | undefined) ?? null },
          ],
        },
        { kind: "text", name: "href", label: "Service page link", nullable: true, help: "Leave empty until a service page exists; the “Explore service” link is then hidden." },
        { kind: "select", name: "copyStatus", label: "Copy status", options: cs(["approved", "provisional"]) },
      ],
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
      label: "Headline",
      fields: [
        { kind: "text", name: "label", label: "Small label (e.g. Contact)", help: "Also the footer's accessible name." },
        { kind: "strings", name: "headlineLines", label: "Headline lines (the second line is followed by the red italic word)", fixed: true },
        { kind: "text", name: "headlineEmphasis", label: "Red italic word" },
      ],
    },
    {
      kind: "group",
      name: "cta",
      label: "Big contact link",
      fields: [
        { kind: "text", name: "top", label: "Top word", help: "e.g. Say" },
        { kind: "text", name: "bottom", label: "Bottom word", help: "e.g. hello" },
        { kind: "text", name: "href", label: "Link target", help: "mailto:you@example.com, /path or https://…" },
      ],
    },
    { kind: "text", name: "email", label: "Email address", help: "Shown as a link in the footer." },
    {
      kind: "group",
      label: "Place and clock",
      fields: [
        { kind: "text", name: "place", label: "Place", help: "e.g. Cairo, Egypt. Shown with a live clock." },
        { kind: "text", name: "timeZone", label: "Clock time zone", help: "An IANA name such as Africa/Cairo." },
      ],
    },
    {
      kind: "group",
      name: "studio",
      label: "Studio text",
      fields: [
        { kind: "text", name: "heading", label: "Heading" },
        { kind: "text", name: "body", label: "Text", multiline: true, rows: 4 },
      ],
    },
    {
      kind: "group",
      name: "explore",
      label: "Link list: Explore",
      fields: [
        { kind: "text", name: "heading", label: "Heading" },
        {
          kind: "list",
          name: "links",
          label: "Links",
          max: 10,
          title: (it) => str(it, "label", "Link"),
          blank: () => ({ label: "New link", href: "/#work" }),
          item: [
            { kind: "text", name: "label", label: "Label" },
            { kind: "text", name: "href", label: "Link", help: "/#work for a homepage section, /path for a page, https://… for another site." },
          ],
        },
      ],
    },
    {
      kind: "group",
      name: "services",
      label: "List: What we do",
      help: "A plain list of words. It is separate from the “Service names” section.",
      fields: [
        { kind: "text", name: "heading", label: "Heading" },
        { kind: "strings", name: "items", label: "Items", max: 12 },
      ],
    },
    {
      kind: "group",
      name: "elsewhere",
      label: "Link list: Elsewhere (social)",
      fields: [
        { kind: "text", name: "heading", label: "Heading" },
        {
          kind: "list",
          name: "links",
          label: "Links",
          max: 10,
          title: (it) => str(it, "label", "Link"),
          blank: () => ({ label: "New profile", href: "" }),
          item: [
            { kind: "text", name: "label", label: "Label" },
            { kind: "text", name: "href", label: "Link", help: "The full profile address, https://… Leave empty until you have it: a profile without an address is not shown on the website." },
          ],
        },
      ],
    },
    {
      kind: "group",
      label: "Small print",
      fields: [
        { kind: "text", name: "copyright", label: "Copyright line" },
        { kind: "text", name: "placeholderNote", label: "Small note under the social links", help: "Optional. Empty by default: nothing is shown." },
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
