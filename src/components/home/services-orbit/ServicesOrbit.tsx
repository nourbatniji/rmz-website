import type { LensContent, ServiceTaxonomyItem } from "@/content/types";
import { OrbitServices } from "@/components/lens-orbit/OrbitServices";

/**
 * Homepage Services section: the approved "orbital services" (variant A of /lab/orbital-services) — the existing lens centred, the seven services
 * written around it, the selected one rising above as a bold title, scroll-linked through one bounded sticky scene.
 *
 * Replaces the earlier ServicesLens section in the same position. Service names / order come from the shared taxonomy (stable ids); copy, details,
 * links and lens scenes come from the typed `lens` content. The section keeps the `#services` anchor used by the Capabilities navigation link.
 *
 * Mobile (< 900 px) uses the orbital prototype's mobile adaptation (curved selector, swipe + buttons, description below, normal scrolling) —
 * PENDING final mobile design approval. Reduced motion: no pinned scene, immediate selection. JavaScript off: plain list of all seven services.
 */
export function ServicesOrbit({ content, services }: { content: LensContent; services: ServiceTaxonomyItem[] }) {
  return <OrbitServices content={content} services={services} variant="A" id="services" />;
}
