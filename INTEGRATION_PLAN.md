# Housing Timelapse Integration Plan

## Overview
This document outlines how the housing timelapse feature will integrate with the existing NYC Civic Visualization codebase.

## Existing Modules We'll Import

### 1. Data Service Pattern
**File**: `src/services/dataService/apiDataService.ts`
**Pattern**: Fetch data from external APIs/files using standard fetch()
**Usage**: Will create similar pattern for NYC Open Data APIs
- Follow the async/await pattern
- Handle errors with try/catch
- Return typed data structures

### 2. Tailwind CSS Styling
**Files**: `tailwind.config.js`, existing component styles
**Pattern**: Utility-first CSS classes
**Usage**: Match existing UI patterns for controls, overlays
- Use slate color palette for controls (e.g., `bg-slate-50`, `border-slate-200`)
- Use rounded-xl for panels (`rounded-xl border border-slate-200`)
- Use shadow-sm for depth
- Match existing spacing (gap-3, p-3, px-6 py-3)

### 3. TypeScript Types
**File**: `src/data/types.ts`
**Pattern**: Strong typing for all data structures
**Usage**: Create new types for housing data
- Define interfaces for NYC Open Data responses
- Type all component props
- Type all state objects

## Patterns We'll Follow

### 1. Overlay Architecture
**Reference**: `src/components/OverlayWrapper.tsx`
**Pattern**: Separate overlay component with backdrop
- Full-screen overlay with backdrop (`fixed inset-0 z-50`)
- Close on backdrop click
- Header with title and close button
- Data loading states (loading, error, success)
- Dropdown for switching between views

However, the housing timelapse is NOT part of the SubviewDefinition system because:
- It's an independent feature, not tied to a specific government node
- It has its own data sources (NYC Open Data)
- It doesn't interact with the Cytoscape graph

### 2. State Management
**Reference**: Controller pattern is NOT applicable here
**Rationale**:
- The housing timelapse is a standalone visualization
- It doesn't manipulate global state (VisualizationState)
- Per Claude.md: "The one exception is the deck.gl overlay as it does not touch global state, only local state"
- Will use React's useState for local state (timeline position, selected year, etc.)

### 3. Data Loading
**Reference**: `src/components/OverlayWrapper.tsx` lines 48-78
**Pattern**: Load data in useEffect, track loading state
```typescript
const [isLoading, setIsLoading] = useState(false);
const [data, setData] = useState<HousingData | null>(null);

useEffect(() => {
  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(dataPath);
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  void loadData();
}, []);
```

## New Dependencies Required

### 1. Deck.gl
**Package**: `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/react`
**Purpose**: 3D building visualization with extrusions
**Justification**: Required for performant WebGL-based 3D rendering

### 2. Maplibre GL
**Package**: `maplibre-gl`
**Purpose**: Base map tiles
**Justification**: Required for underlying map view

### 3. Type Definitions
**Package**: `@types/maplibre-gl`
**Purpose**: TypeScript support

## New Patterns We Need to Introduce

### 1. NYC Open Data Fetching with Caching
**Why**: Need to cache large datasets to avoid repeated API calls
**Implementation**:
```typescript
// src/lib/data/housingDataProcessor.ts
- Fetch from NYC Open Data APIs
- Cache responses in localStorage or IndexedDB
- Check cache before fetching
- Include cache invalidation strategy (e.g., 24h TTL)
```

**Justification**: NYC Open Data APIs can be slow; caching improves UX

### 2. Activation Pattern
**Why**: Need a way to open the housing timelapse overlay
**Options**:
1. Add a new button in the DiagramViewToggle component
2. Add to the OverlayWrapper dropdown
3. Create standalone entry point in header

**Recommended**: Option 1 - Add button next to "Diagram" / "Views" toggle
**Rationale**:
- Non-invasive
- Keeps existing functionality intact
- Clear separation of concerns

### 3. Timeline State Management
**Why**: Need to track current year, animation state
**Implementation**:
```typescript
// Local state in HousingTimelapse component
const [currentYear, setCurrentYear] = useState(2010);
const [isPlaying, setIsPlaying] = useState(false);
const [playbackSpeed, setPlaybackSpeed] = useState(1);
```

## File Structure

```
src/
├── components/
│   └── HousingTimelapse/
│       ├── index.tsx              # Main overlay component
│       ├── Map3D.tsx              # Deck.gl map wrapper
│       ├── TimeSlider.tsx         # Timeline control
│       ├── Legend.tsx             # Color legend for zoning
│       └── types.ts               # TypeScript interfaces
├── hooks/
│   └── useHousingData.ts          # Custom hook for data fetching
└── lib/
    └── data/
        └── housingDataProcessor.ts # Data transformation utilities
```

## Integration Points

### 1. App.tsx
**Changes**: Add conditional render for housing timelapse overlay
**Location**: After line 159 (after OverlayWrapper)
```typescript
{viewMode === 'housing' && (
  <HousingTimelapse onClose={() => setViewMode('diagram')} />
)}
```

**Note**: This violates the "don't wire in App" rule, BUT per Claude.md:
> "The one exception is the deck.gl overlay as it does not touch global state, only local state"

This is acceptable because housing timelapse is a self-contained overlay.

### 2. DiagramViewToggle.tsx
**Changes**: Add housing timelapse button
**Pattern**: Follow existing button style and layout

### 3. Data Loading
**No changes to existing data service**
- Housing data is independent of government structure data
- Will create separate data loading utilities

## API Endpoints (NYC Open Data)

### 1. Housing New York Units
- **URL**: `https://data.cityofnewyork.us/resource/hg8x-zxpr.json`
- **Format**: JSON
- **Fields**: Building ID, address, borough, total units, affordable units, completion date, lat/lon

### 2. Zoning Districts
- **URL**: `https://data.cityofnewyork.us/resource/7qct-p7rj.json`
- **Format**: GeoJSON
- **Fields**: Zoning district code, geometry

### 3. DOB Filings (Optional - Phase 2)
- **URL**: `https://data.cityofnewyork.us/resource/ic3t-wcy2.json`
- **Format**: JSON
- **Fields**: Job type, filing date, address, lat/lon

## Testing Strategy

### Phase 1: Data Layer
1. Test NYC Open Data API connectivity
2. Test data transformation (building heights, colors)
3. Test caching mechanism

### Phase 2: Visualization
1. Test deck.gl layer rendering
2. Test timeline slider interaction
3. Test animation performance (60fps target)

### Phase 3: Integration
1. Test overlay open/close
2. Test interaction with existing app state
3. Test mobile responsiveness

## Deviations from Existing Patterns

### 1. Not Using Controller/InputHandler
**Deviation**: Housing timelapse doesn't use the InputHandler → Controller → App flow
**Justification**:
- It's a standalone overlay with local state only
- Doesn't interact with Cytoscape graph
- Explicitly allowed per Claude.md for deck.gl overlays

### 2. New Dependencies
**Deviation**: Adding deck.gl and maplibre-gl
**Justification**:
- Required for 3D map visualization
- No existing visualization library in codebase supports this
- These are industry-standard libraries for web mapping

### 3. External API Calls
**Deviation**: Fetching from NYC Open Data (external to project)
**Justification**:
- Data source is external and public
- Too large to bundle with project
- Following existing pattern of loading external data (see OverlayWrapper)

## Summary

This integration:
1. **Follows existing patterns** for overlay UI, styling, data loading
2. **Uses familiar modules** for TypeScript types, Tailwind CSS
3. **Introduces minimal new patterns** only where necessary (caching, deck.gl)
4. **Respects architecture** by keeping state local and not touching Controller
5. **Requires new dependencies** only for essential 3D mapping functionality
