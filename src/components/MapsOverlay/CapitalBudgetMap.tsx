// ABOUTME: Capital budget projects 3D map visualization
// ABOUTME: Shows NYC capital projects as extruded polygons/footprints based on budget amounts

import { useState } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import { useCapitalBudgetData, type CapitalProjectFeature } from '../../hooks/useCapitalBudgetData';

const INITIAL_VIEW_STATE = {
  longitude: -73.935,
  latitude: 40.73,
  zoom: 10,
  pitch: 45,
  bearing: 0,
};

// Color by managing agency
const AGENCY_COLORS: Record<string, [number, number, number]> = {
  DDC: [220, 38, 38],      // red - Design & Construction (largest)
  DPR: [34, 197, 94],      // green - Parks & Recreation
  EDC: [37, 99, 235],      // blue - Economic Development
  CUNY: [234, 179, 8],     // yellow - City University
  HHC: [168, 85, 247],     // purple - Health & Hospitals
  DCLA: [236, 72, 153],    // pink - Cultural Affairs
  DCAS: [20, 184, 166],    // teal - Citywide Admin Services
  DOT: [249, 115, 22],     // orange - Transportation
  HPD: [132, 204, 22],     // lime - Housing Preservation
  DEP: [14, 165, 233],     // sky blue - Environmental Protection
  TGI: [163, 163, 163],    // gray - Governors Island
  NYPD: [30, 58, 138],     // dark blue - Police
  FDNY: [185, 28, 28],     // dark red - Fire
  BNY: [91, 33, 182],      // deep purple - Brooklyn Navy Yard
  DHS: [217, 119, 6],      // amber - Homeless Services
};

const DEFAULT_COLOR: [number, number, number] = [150, 150, 150]; // gray for others

export function CapitalBudgetMap() {
  const { projects, isLoading, error } = useCapitalBudgetData();
  const [hoveredProject, setHoveredProject] = useState<CapitalProjectFeature | null>(null);

  const layer = new GeoJsonLayer({
    id: 'capital-projects',
    data: projects,
    filled: true,
    extruded: true,
    wireframe: true,
    pickable: true,
    elevationScale: 0.5,
    getElevation: (d: any) => d.properties.allocate_total / 10000, // Scale budget to reasonable height
    getFillColor: (d: any) => {
      const color = AGENCY_COLORS[d.properties.magencyacro] || DEFAULT_COLOR;
      return [...color, 200]; // Add alpha channel
    },
    getLineColor: [80, 80, 80],
    lineWidthMinPixels: 1,
    onHover: (info: PickingInfo) => {
      if (info.object) {
        setHoveredProject(info.object as CapitalProjectFeature);
      } else {
        setHoveredProject(null);
      }
    },
  });

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <div className="text-center">
            <div className="text-slate-900 text-xl mb-2">Loading capital projects...</div>
            <div className="text-slate-600">Fetching from NYC Open Data</div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <div className="text-center max-w-md">
            <div className="text-red-600 text-xl mb-2">Failed to Load Data</div>
            <div className="text-slate-700">{error}</div>
          </div>
        </div>
      )}

      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={[layer]}
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        />
      </DeckGL>

      {/* Hover tooltip */}
      {hoveredProject && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-10">
          <div className="font-semibold text-gray-900">{hoveredProject.properties.description}</div>
          <div className="text-sm text-gray-600 mt-1">
            <div><span className="font-medium">Project ID:</span> {hoveredProject.properties.maprojid}</div>
            <div><span className="font-medium">Agency:</span> {hoveredProject.properties.magencyname} ({hoveredProject.properties.magencyacro})</div>
            <div><span className="font-medium">Type:</span> {hoveredProject.properties.typecategory}</div>
            <div><span className="font-medium">Allocated:</span> ${(hoveredProject.properties.allocate_total / 1000000).toFixed(1)}M</div>
            <div><span className="font-medium">Committed:</span> ${(hoveredProject.properties.commit_total / 1000000).toFixed(1)}M</div>
            <div><span className="font-medium">Spent:</span> ${(hoveredProject.properties.spent_total / 1000000).toFixed(1)}M</div>
            {hoveredProject.properties.fiscalYear && (
              <div><span className="font-medium">Fiscal Year:</span> {hoveredProject.properties.fiscalYear}</div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-10">
        <div className="font-semibold text-gray-900 mb-2">Top Agencies</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {Object.entries(AGENCY_COLORS).slice(0, 10).map(([agency, color]) => (
            <div key={agency} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ backgroundColor: `rgb(${color.join(',')})` }}
              />
              <span className="truncate">{agency}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
          <div className="text-xs text-gray-600">
            <strong>Height:</strong> Allocated budget
          </div>
          <div className="text-xs text-gray-600">
            <strong>Filter:</strong> 2025 active projects
          </div>
        </div>
      </div>
    </div>
  );
}
