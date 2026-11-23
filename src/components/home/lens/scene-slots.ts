import type { LensImageKey } from "@/content/types";

/** One picture per service: the lens shows the slot that belongs to the selected service. Slots h and i are not used any more. */
export const SERVICE_SLOT: Record<string, LensImageKey> = {
  branding: "a",
  "creative-strategy": "b",
  "content-production": "c",
  "social-media": "d",
  design: "e",
  "paid-media": "f",
  "web-experiences": "g",
};
export const SERVICE_NAME: Record<string, string> = {
  branding: "Branding",
  "creative-strategy": "Creative strategy",
  "content-production": "Content production",
  "social-media": "Social media",
  design: "Design",
  "paid-media": "Paid media",
  "web-experiences": "Web experiences",
};
const ORDER: LensImageKey[] = ["a", "b", "c", "d", "e", "f", "g"];
/** The slot a service draws; falls back to its position in the list. */
export const slotOfService = (serviceId: string, index = 0): LensImageKey => SERVICE_SLOT[serviceId] ?? ORDER[index % ORDER.length];
export const serviceOfSlot = (k: string): string | undefined => Object.keys(SERVICE_SLOT).find((s) => SERVICE_SLOT[s] === k);
