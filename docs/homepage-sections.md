# Homepage sections — canvas order, internal names, label mismatches

Canvas: RMZ — ENHANCED EDITION / 01. Internal component names describe **behaviour**; visible content is preserved.
Mismatches are recorded for separate confirmation of final labels; they do not block implementation.

| Order | Canvas board title | Actual content | Component (planned) | Status |
|---|---|---|---|---|
| 1 | HOME - HERO SECTION | Prism wall, 3 banners, scroll-scrubbed sequence | `HeroWall` | built (placeholders) |
| 2 | HOME - VIDEO SECTION | 3D corridor with showreel + 6 demo posters | `ShowreelCorridor` | todo |
| 3 | HOME - TEXT SECTION | Rotating-word statement | `StatementRotator` | built |
| 4 | HOME - ABOUT SECTION | **Selected work**: pinned, 6 demo projects, card turns front→back on scroll (no about copy) | `FeaturedWorkFocus` | built (placeholder content) — see docs/featured-work-section.md |
| 5 | HOME - SERVICES SECTION | Rotating dial of 7 "focal lengths" (services) | `ServicesDial` | todo |
| 6 | HOME - MINDS SECTION | **Minds**: 8 expanding columns of minds / team members (NOT services) | `Minds` | built (placeholder content) |
| 7 | A · The Collective (CollabA) | "Good …" collaborations / partner logos | `Collaborations` | todo |
| 8 | RMZ · Footer | Contact CTA + columns | `SiteFooter` | todo |

Mismatches to confirm:
1. Board 4 is titled **About** but contains featured/selected work. No About copy exists in the canvas.
2. Board 6 is titled **Minds** but contains eight services; boards 5 and 6 both present services (7 vs 8 items, different names). Both kept as designed — nothing merged, duplicated or reinterpreted.
3. Header nav lists Work / Capabilities / Studio / Contact; no Studio/Capabilities/Work targets are named in the canvas. Placeholder anchors `#work #capabilities #studio #contact` are used (Work page is deferred).
4. Footer "Explore" links (`#work #selected #services #minds #logos`) refer to anchors that need final mapping.
5. The canvas "Simulated scroll" slider on the hero is a prototype aid; the build uses real page scroll.

> Board 2 (HOME - VIDEO SECTION / MOBILE · 01) is built as `ShowreelCorridor` — see docs/video-section.md.

> Board 5 (HOME - SERVICES SECTION) is built as `ServicesLens` (section id `services`) — see docs/lens-section.md. It replaces the "Services dial" dev marker.

> Section identity (clarified): **Services = the lens** (`ServicesLens`, id `services`); **Minds = the eight columns** below it (`Minds`, id `minds`, formerly `ServiceFins`). Header nav: Capabilities → `#services`, Studio → `#minds` (Studio mapping pending confirmation).
