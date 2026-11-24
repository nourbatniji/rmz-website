# Collaborations (homepage) — magnetic logos, managed from the dashboard

The approved magnetic prototype (`/lab/collaborations-magnetic`) is now the homepage Collaborations section, driven by the dashboard section **Website → Collaborations** (`/admin/website/collaborations`).

## What the dashboard controls
- **Section**: show / hide, small label, heading (first part + red italic part). Draft → Preview → Publish works as for every other section.
- **Partner logos**: add, delete, hide without deleting, reorder (drag handle, keyboard, or arrows), upload / replace artwork (existing media workflow: Upload, Library or URL), name, accessible alternative text, optional destination link (real `<a>`), visual size 50–160 % with a live preview.
- **Central RMZ square**: artwork upload / replace (independent of the logos), accessible label, artwork size 30–100 %, square colour, lettering colour. Uploaded artwork keeps its original colours; “Paint uploaded artwork in one colour” is an opt-in that uses the artwork's transparency as a stencil (only sensible for single-colour artwork). With no artwork the approved “RMZ” lettering is used.

## Storage
Existing `SiteSection` table, key `collaborations`, JSON validated by `collaborationsSchema` (`src/content/schemas.ts`, contract in `src/content/collab-types.ts`). **No database migration is needed.** Until the section is saved, the site uses the built-in default (`defaultCollaborations()` in `src/lib/content/sections.ts`): the twelve placeholder wordmarks, red RMZ square — identical to the approved prototype. “Reset to original content” returns to it.

## Layout (no hand-placed slots)
`src/components/home/collaborations/layout.ts` calculates the arrangement from the visible entries' real bounds and the field width:
- rows above and below the square, one logo each side from six logos on; rows are balanced, evenly spread (gap capped), wrap when the width runs out — the section then grows taller; logos are never shrunk to fit, overlapped, hidden or scrolled;
- phones, eight or more logos: the approved ring (rows top/bottom, columns left/right) with a free channel for the finger;
- zero visible logos: the section is not rendered; one / two / three: compact rows above/below the square;
- sizes: optical sizing (equal visual weight, boost for compact marks) × the editor's size setting; aspect from the uploaded width/height or measured when the artwork loads; the layout is recalculated on resize and after artwork loads and is otherwise stable during interaction.
The gathering positions are computed from the current count the same way. The magnet engine (nearest-two attraction, damping, connectors, drag-vs-tap, keyboard, reduced motion, off-screen suspension) is the prototype's, generalised to the calculated rest positions; pulled logos are also kept clear of their neighbours.

A missing / broken image falls back to the placeholder wordmark (built-in entries) or the entry's name as text.
