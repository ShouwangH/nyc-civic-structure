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

// Color by budget amount - gradient from blue (low) to red (high)
function getBudgetColor(allocatedAmount: number): [number, number, number, number] {
  // Budget thresholds in millions
  if (allocatedAmount < 5_000_000) return [37, 99, 235, 200]; // blue - small projects
  if (allocatedAmount < 20_000_000) return [34, 197, 94, 200]; // green - medium projects
  if (allocatedAmount < 50_000_000) return [234, 179, 8, 200]; // yellow - large projects
  return [220, 38, 38, 200]; // red - very large projects (>$50M)
}

export function CapitalBudgetMap() {
  const { projects, isLoading, error } = useCapitalBudgetData();
  const [hoveredProject, setHoveredProject] = useState<CapitalProjectFeature | null>(null);

  const layer = new GeoJsonLayer<CapitalProjectFeature>({
    id: 'capital-projects',
    data: projects,
    filled: true,
    extruded: true,
    wireframe: true,
    pickable: true,
    elevationScale: 0.5,
    getElevation: (d) => d.properties.allocate_total / 10000, // Scale budget to reasonable height
    getFillColor: (d) => getBudgetColor(d.properties.allocate_total),
    getLineColor: [80, 80, 80],
    lineWidthMinPixels: 1,
    onHover: (info: PickingInfo<CapitalProjectFeature>) => {
      if (info.object) {
        setHoveredProject(info.object);
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
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
        <div className="font-semibold text-gray-900 mb-2">Budget Size</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(37, 99, 235)' }} />
            <span>&lt; $5M</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(34, 197, 94)' }} />
            <span>$5M - $20M</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(234, 179, 8)' }} />
            <span>$20M - $50M</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(220, 38, 38)' }} />
            <span>&gt; $50M</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <strong>Footprint:</strong> Project area
          </div>
          <div className="text-xs text-gray-600">
            <strong>Height:</strong> Allocated budget
          </div>
        </div>
      </div>

      {/* Info banner - data source */}
      {!isLoading && !error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 z-10">
          <div className="text-sm text-blue-800">
            <span className="font-medium">Live Data:</span> NYC Capital Projects Database (CPDB) - {projects.length} projects loaded
          </div>
        </div>
      )}
    </div>
  );
}
