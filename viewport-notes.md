# Process Viewport Anchoring — Scratchpad

## Current Question
- Can the ephemeral process nodes render around the viewer’s current camera position instead of drifting toward the global origin?

## Initial Ideas
- Read the current viewport via `cy.extent()` (or `cy.pan()`/`cy.zoom()`) and translate the ELK output so its bounding box centers on that rectangle.
- Pass a `boundingBox` to the ELK layout that mirrors the viewport, keeping `fit: false` so the camera stays put.
- Fall back to a `'preset'` layout by computing node coordinates relative to the viewport center if ELK alignment proves unreliable.

## Attempt Log
- **2025-??-??** — tried feeding ELK a viewport-derived `boundingBox`. Result: didn’t behave as expected in practice, so the change was rolled back.
- **2025-??-??** — prototyped preset positions: assign radial coordinates around the viewport center for all process nodes and skip ELK. Current behavior: nodes sit in a circle; needs UX review before ship.

## Open Threads
- Verify whether Cytoscape’s `extent` values give us a stable rectangle while animations are running (might need to snapshot before layout).
- Explore combining viewport anchoring with our existing translation helper that aligns subgraph layouts to an entry node.
