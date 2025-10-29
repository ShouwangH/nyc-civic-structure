# NYC Civics Visualization

A lightweight Vite + React + TypeScript project that visualizes how New York City government functions. The app renders data exclusively from `data/government.json`, with Cytoscape.js powering the graph in future phases. Styling is handled with Tailwind CSS, and Bun manages packages and scripts.

## Getting started

1. Install dependencies with Bun:

   ```bash
   bun install
   ```

2. Start the development server:

   ```bash
   bun run dev
   ```

3. Build for production when you are ready to deploy:

   ```bash
   bun run build
   ```

## Tech stack

- React + TypeScript via Vite
- Tailwind CSS for utility-first styling
- Cytoscape.js (installed) for interactive graph rendering
- Bun for dependency and script management

## Next steps

- Phase 1: mount Cytoscape and render the NYC government graph from `data/government.json`.
- Phase 2+: layer in process highlighting, sidebar details, and additional storytelling polish following `AGENTS.md`.
