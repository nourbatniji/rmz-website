import { z } from "zod";
import type {
  CorridorContent,
  FeaturedWorkContent,
  HeroContent,
  ImageRef,
  LensContent,
  MindsContent,
  SequenceRef,
  SiteContent,
  StatementContent,
} from "./types";
import type { WorkContent, WorkProject } from "./work-types";

/**
 * Zod schemas for everything the dashboard can edit. Each one is annotated with the hand-written contract type
 * (src/content/types.ts, work-types.ts), so TypeScript fails the build if a schema and its contract drift apart.
 * The same schemas validate the forms (server actions) and the database read path.
 */

const text = z.string().trim();
const required = (what: string) => text.min(1, `${what} is required`);

/** Internal link: #anchor, /path, https://, mailto: or tel:. Blocks javascript: and data: URLs. */
export const linkSchema = z
  .string()
  .trim()
  .min(1, "Link is required")
  .refine((v) => /^(#|\/(?!\/)|https?:\/\/|mailto:|tel:)/i.test(v), "Use #anchor, /path, https://…, or mailto:");

/** Media URL: a site path (/media/…) or an https URL (uploaded file). */
const mediaUrl = z
  .string()
  .trim()
  .min(1, "File is required")
  .refine((v) => /^(\/(?!\/)|https:\/\/)/i.test(v), "Use /media/… or an https:// URL");

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #FFCA26");
const objectPosition = z.string().regex(/^\d{1,3}% \d{1,3}%$/, "Use two percentages, e.g. 50% 30%");

export const imageRefSchema: z.ZodType<ImageRef> = z.object({
  src: mediaUrl,
  alt: z.string(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const sequenceRefSchema: z.ZodType<SequenceRef> = z.union([
  z.object({ frames: z.array(mediaUrl).min(1, "Add at least one frame") }),
  z.object({
    pattern: z.string().refine((v) => v.includes("{n}"), "Pattern must contain {n}"),
    frameCount: z.number().int().positive(),
    startAt: z.number().int().min(0),
    digits: z.number().int().min(1).max(8),
  }),
]);

const headline = z.object({ lead: text, emphasis: text });

export const siteSchema: z.ZodType<SiteContent> = z.object({
  brand: z.object({ name: required("Brand name"), logo: imageRefSchema.nullable() }),
  nav: z.array(z.object({ label: required("Label"), href: linkSchema })).min(1).max(6),
});

export const heroSchema: z.ZodType<HeroContent> = z.object({
  headline,
  intro: required("Intro"),
  scrollHint: text,
  tagline: text.optional(),
  ctaLabel: text.optional(),
  ctaHref: linkSchema.optional(),
  banners: z
    .array(
      z.object({
        id: required("Id"),
        number: required("Number"),
        label: required("Label"),
        accent: color,
        description: required("Description"),
        poster: imageRefSchema.nullable(),
        sequence: sequenceRefSchema.nullable(),
        phraseLead: text.optional(),
        phraseEmphasis: text.optional(),
      }),
    )
    .min(1)
    .max(6),
});

export const corridorSchema: z.ZodType<CorridorContent> = z.object({
  kicker: text,
  headline,
  intro: text,
  arrivalHeadline: text,
  arrivalDescription: text,
  video: z.object({ src: mediaUrl }).nullable(),
  poster: imageRefSchema.nullable(),
  accessibleDescription: required("Accessible description"),
});

export const statementSchema: z.ZodType<StatementContent> = z.object({
  lead: z.array(required("Word")).min(1),
  connector: z.array(required("Word")),
  words: z.array(required("Word")).min(2, "Add at least two rotating words").max(10),
});

export const servicesSchema = z.object({
  items: z.array(z.object({ id: required("Id"), name: required("Name") })).min(1),
});

export const lensSchema: z.ZodType<LensContent> = z.object({
  kicker: text,
  heading: headline,
  intro: text,
  hintDesktop: text,
  hintMobile: text,
  initialSelectedId: required("Initial service"),
  items: z
    .array(
      z.object({
        serviceId: required("Service"),
        focal: required("Focal label"),
        ringMark: required("Ring mark"),
        description: required("Description"),
        details: z.tuple([required("Detail"), required("Detail"), required("Detail")]),
        scene: z.enum(["triptych", "detail", "fullframe", "collage", "devices", "contactsheet", "reach"]),
        href: linkSchema.nullable(),
        copyStatus: z.enum(["approved", "provisional"]),
      }),
    )
    .min(1),
  images: z.partialRecord(z.enum(["a", "b", "c", "d", "e", "f", "g", "h", "i"]), imageRefSchema.nullable()),
});

export const mindsSchema: z.ZodType<MindsContent> = z.object({
  label: required("Label"),
  initialOpenId: required("Open column"),
  items: z
    .array(
      z.object({
        id: required("Id"),
        number: required("Number"),
        name: required("Name"),
        role: required("Role"),
        bio: required("Biography"),
        copyStatus: z.enum(["approved", "placeholder"]),
        image: imageRefSchema.nullable(),
        imagePosition: objectPosition,
      }),
    )
    .length(8, "The Minds design has exactly 8 columns"),
});

export const featuredSchema: z.ZodType<FeaturedWorkContent> = z.object({
  label: required("Label"),
  items: z
    .array(
      z.object({
        id: required("Id"),
        number: required("Number"),
        name: required("Name"),
        category: required("Category"),
        description: required("Description"),
        copyStatus: z.enum(["approved", "placeholder"]),
        image: imageRefSchema.nullable(),
        imagePosition: objectPosition,
        placeholderColor: color,
      }),
    )
    .min(3, "Add at least 3 cards")
    .max(12),
});

export const workIntroSchema = z.object({
  label: text,
  headingLead: text,
  headingEmphasis: text,
  intro: text,
  categories: z.array(z.object({ id: z.enum(["all", "brand", "camp", "dig", "cont"]), label: required("Label") })).min(1),
  emptyTitle: text,
  emptyBody: text,
  contact: z.object({ label: required("Label"), href: linkSchema }),
});
// Compile-time check: the schema output must satisfy the contract (minus projects).
type _WorkIntro = Omit<WorkContent, "projects">;
const _workIntroCheck: z.ZodType<_WorkIntro> = workIntroSchema;
void _workIntroCheck;

/** Everything of a WorkProject except the columns the database keeps itself (slug, name, category, number). */
export const projectBodySchema = z.object({
  discipline: required("Discipline"),
  year: required("Year"),
  client: text.nullable(),
  palette: z.tuple([color, color, color, color]),
  image: imageRefSchema.nullable(),
  about: text,
  services: text,
  brief: text,
  idea: text,
  keys: z.array(required("Key")),
  deliverables: z.array(required("Deliverable")),
  credits: z.array(z.object({ role: required("Role"), name: text.nullable() })),
  copyStatus: z.enum(["placeholder", "approved"]),
  /** Which page blocks are shown, and in what order. Missing = the original page. */
  layout: z.array(z.object({ id: z.enum(["meta", "hero", "brief", "idea", "execution", "showcase", "strip", "outcome", "credits"]), show: z.boolean() })).max(20).optional(),
  /** Single images / paragraphs deleted from the page, by element id. */
  hidden: z.array(z.string().regex(/^[a-z]+\.[a-z0-9]+$/)).max(60).optional(),
  /** Replacement pictures for the demo art, by element id. */
  images: z.record(z.string().regex(/^[a-z]+\.[a-z0-9]+$/), imageRefSchema).optional(),
  /** The film shown in the showcase of campaign and content projects (uploaded in the dashboard). Missing = the labelled placeholder. */
  video: z.object({ src: mediaUrl }).nullable().optional(),
  /** Editor-written replacements for the page's fixed wording (captions, headings, labels), by id. Missing = the built-in wording. */
  texts: z.record(z.string().regex(/^[a-z]+\.[a-zA-Z0-9]+$/), z.string().max(600)).optional(),
});
export type ProjectBody = z.infer<typeof projectBodySchema>;

export const projectSlugSchema = z
  .string()
  .trim()
  .min(2, "Slug is required")
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single dashes only");

export const projectCategorySchema = z.enum(["brand", "camp", "dig", "cont"]);

export function toWorkProject(
  row: { slug: string; name: string; category: string; body: unknown },
  number: string,
): WorkProject | null {
  const body = projectBodySchema.safeParse(row.body);
  const category = projectCategorySchema.safeParse(row.category);
  if (!body.success || !category.success) return null;
  return { slug: row.slug, number, name: row.name, category: category.data, ...body.data };
}
