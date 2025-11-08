// ABOUTME: Capital budget projects 3D map visualization
// ABOUTME: Shows NYC capital projects as extruded columns based on budget amounts

import { useState, useEffect } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { ColumnLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';

// Placeholder data structure - to be replaced with real API data
type CapitalProject = {
  id: string;
  agency: string;
  description: string;
  borough: string;
  amount: number;
  coordinates: [number, number]; // [longitude, latitude]
  status: string;
  fiscalYear: string;
};

// Mock data for demonstration - will be replaced with real API fetch
const MOCK_PROJECTS: CapitalProject[] = [
  {
    id: '1',
    agency: 'DOT',
    description: 'Bridge Rehabilitation',
    borough: 'Manhattan',
    amount: 5000000,
    coordinates: [-74.006, 40.7128],
    status: 'Pending',
    fiscalYear: '2025',
  },
  {
    id: '2',
    agency: 'Parks',
    description: 'Park Renovation',
    borough: 'Brooklyn',
    amount: 2000000,
    coordinates: [-73.935, 40.678],
    status: 'In Progress',
    fiscalYear: '2025',
  },
];

const INITIAL_VIEW_STATE = {
  longitude: -73.935,
  latitude: 40.73,
  zoom: 10,
  pitch: 45,
  bearing: 0,
};

// Color by borough
const BOROUGH_COLORS: Record<string, [number, number, number]> = {
  Manhattan: [220, 38, 38], // red
  Brooklyn: [37, 99, 235], // blue
  Queens: [34, 197, 94], // green
  Bronx: [234, 179, 8], // yellow
  'Staten Island': [168, 85, 247], // purple
};

export function CapitalBudgetMap() {
  const [projects] = useState<CapitalProject[]>(MOCK_PROJECTS);
  const [hoveredProject, setHoveredProject] = useState<CapitalProject | null>(null);

  const layer = new ColumnLayer<CapitalProject>({
    id: 'capital-projects',
    data: projects,
    diskResolution: 12,
    radius: 100,
    extruded: true,
    pickable: true,
    elevationScale: 0.01,
    getPosition: (d) => d.coordinates,
    getFillColor: (d) => BOROUGH_COLORS[d.borough] || [150, 150, 150],
    getLineColor: [0, 0, 0],
    getElevation: (d) => d.amount,
    onHover: (info: PickingInfo<CapitalProject>) => {
      if (info.object) {
        setHoveredProject(info.object);
      } else {
        setHoveredProject(null);
      }
    },
  });

  return (
    <div className="relative w-full h-full">
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
          <div className="font-semibold text-gray-900">{hoveredProject.description}</div>
          <div className="text-sm text-gray-600 mt-1">
            <div><span className="font-medium">Agency:</span> {hoveredProject.agency}</div>
            <div><span className="font-medium">Borough:</span> {hoveredProject.borough}</div>
            <div><span className="font-medium">Amount:</span> ${(hoveredProject.amount / 1000000).toFixed(1)}M</div>
            <div><span className="font-medium">Status:</span> {hoveredProject.status}</div>
            <div><span className="font-medium">Fiscal Year:</span> {hoveredProject.fiscalYear}</div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
        <div className="font-semibold text-gray-900 mb-2">Borough</div>
        {Object.entries(BOROUGH_COLORS).map(([borough, color]) => (
          <div key={borough} className="flex items-center gap-2 text-sm">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: `rgb(${color.join(',')})` }}
            />
            <span>{borough}</span>
          </div>
        ))}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            Height represents project budget
          </div>
        </div>
      </div>

      {/* Info banner - data source placeholder */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 z-10">
        <div className="text-sm text-yellow-800">
          <span className="font-medium">Note:</span> Using mock data. Connect to NYC Open Data API (fi59-268w) for real capital budget data.
        </div>
      </div>
    </div>
  );
}
