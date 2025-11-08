# NYC Housing Timelapse Visualization

## Objective
Create a 2.5D map showing NYC construction over time with zoning-based colors and building height representing housing units.

## Core Requirements
- Interactive timeline slider (2014-2024)
- Building extrusions proportional to total housing units
- Color coding by zoning district
- Highlight affordable housing percentage
- Smooth animations between time periods

## Data Sources
1. Housing New York Units: https://data.cityofnewyork.us/api/v3/views/64uk-42ks/query.json
2. NYC Zoning: https://data.cityofnewyork.us/City-Government/Department-of-City-Planning-Zoning-Features/7qct-p7rj
3. DOB Filings: https://data.cityofnewyork.us/Housing-Development/DOB-Job-Application-Filings/ic3t-wcy2

## Technical Requirements
- Use Deck.gl for 3D visualization
- Maplibre for base tiles
- Cache data locally to avoid repeated API calls
- Target 60fps animation performance

## File Structure
```
src/
├── components/
│   └── HousingOverlay/
│       ├── index.tsx
│       └── HousingTimelapse.tsx
├── visualization/
│   └── HousingTimelapse/
│       ├── Map3D.tsx
│       ├── TimeSlider.tsx
│       └── Legend.tsx
├── hooks/
│   └── useHousingData.ts
└── lib/
    └── data/
        └── housingDataProcessor.ts
```

## Implementation Phases
1. **Data Pipeline** - Fetch and cache NYC Open Data
2. **Basic Map** - 2D zoning visualization
3. **3D Extrusion** - Add building heights
4. **Timeline** - Add time control and animation
5. **Polish** - Performance optimization and mobile support

## Success Metrics
- Initial load < 3 seconds
- Smooth 60fps during animation
- All data properly attributed to NYC Open Data
- Accessible via keyboard navigation

## Workflow Requirements

### Git Workflow
- Create feature branch from main/develop
- Make atomic commits with conventional commit messages
- Don't modify existing files unless necessary
- Add new features as non-breaking additions

### Code Review Prep
- Add JSDoc comments for new public APIs
- Include unit tests in same PR
- Update relevant documentation
- No changes to shared components without discussion

### Development Phases
1. Data layer (separate PR if needed)
2. Basic visualization
3. Enhancements and animations
4. Performance optimization

### Don't
- Don't refactor existing code unless specified
- Don't change existing API contracts
- Don't modify the build configuration
- Don't add dependencies without noting them for review

## Session Workflow Notes

### When starting a session
Focus only on the housing-timelapse feature. Ignore unrelated parts of the codebase.

Key existing files to be aware of:
- `src/lib/api/client.ts` (our API wrapper)
- `src/components/Layout/VisualizationLayout.tsx` (wrapper to use)
- `src/styles/theme.ts` (our design system)

Don't modify these, just use them.

### For complex integrations
Before implementing, create an INTEGRATION_PLAN.md showing:
1. Which existing modules you'll import
2. Which patterns you'll follow
3. Any new patterns you need to introduce and why

### Incremental development
Continue working on the housing-timelapse branch.
- Check the current progress
- Run any tests
- Continue with the next phase
- Commit with conventional commit messages (feat: description)

### Review and refine
Review the housing-timelapse implementation. Create a REVIEW.md file with:
1. What's complete
2. What needs adjustment for our architecture
3. Any deviations from our patterns that need fixing

Then fix any architectural inconsistencies.
