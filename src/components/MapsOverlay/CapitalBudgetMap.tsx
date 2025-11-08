// ABOUTME: Capital budget projects 3D map visualization
// ABOUTME: Shows NYC capital projects as extruded polygons/footprints based on budget amounts

import { useState } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Feature, Polygon, Point } from 'geojson';

// GeoJSON Feature properties for capital projects
type CapitalProjectProperties = {
  maprojid: string;
  description: string;
  managingagency: string;
  borough: string;
  totalcost: number;
  projecttype: string;
  status: string;
  fy: string;
};

// GeoJSON Feature type for capital projects (supports both Point and Polygon)
type CapitalProjectFeature = Feature<Polygon | Point, CapitalProjectProperties>;

// Mock GeoJSON data - will be replaced with real API fetch from CPDB Polygons dataset (9jkp-n57r)
const MOCK_PROJECTS: CapitalProjectFeature[] = [
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-74.008, 40.712],
        [-74.004, 40.712],
        [-74.004, 40.714],
        [-74.008, 40.714],
        [-74.008, 40.712],
      ]],
    },
    properties: {
      maprojid: 'DOT001',
      description: 'Brooklyn Bridge Rehabilitation',
      managingagency: 'DOT',
      borough: 'Manhattan',
      totalcost: 5000000,
      projecttype: 'Reconstruction',
      status: 'In Construction',
      fy: '2025',
    },
  },
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-73.936, 40.677],
        [-73.933, 40.677],
        [-73.933, 40.679],
        [-73.936, 40.679],
        [-73.936, 40.677],
      ]],
    },
    properties: {
      maprojid: 'PARKS002',
      description: 'Prospect Park Renovation',
      managingagency: 'Parks',
      borough: 'Brooklyn',
      totalcost: 2000000,
      projecttype: 'Reconstruction',
      status: 'In Design',
      fy: '2025',
    },
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
  const [projects] = useState<CapitalProjectFeature[]>(MOCK_PROJECTS);
  const [hoveredProject, setHoveredProject] = useState<CapitalProjectFeature | null>(null);

  const layer = new GeoJsonLayer<CapitalProjectFeature>({
    id: 'capital-projects',
    data: projects,
    filled: true,
    extruded: true,
    wireframe: true,
    pickable: true,
    elevationScale: 0.5,
    getElevation: (d) => d.properties.totalcost / 10000, // Scale budget to reasonable height
    getFillColor: (d) => BOROUGH_COLORS[d.properties.borough] || [150, 150, 150, 200],
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
            <div><span className="font-medium">Agency:</span> {hoveredProject.properties.managingagency}</div>
            <div><span className="font-medium">Borough:</span> {hoveredProject.properties.borough}</div>
            <div><span className="font-medium">Total Cost:</span> ${(hoveredProject.properties.totalcost / 1000000).toFixed(1)}M</div>
            <div><span className="font-medium">Type:</span> {hoveredProject.properties.projecttype}</div>
            <div><span className="font-medium">Status:</span> {hoveredProject.properties.status}</div>
            <div><span className="font-medium">Fiscal Year:</span> {hoveredProject.properties.fy}</div>
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
            Footprint shows project area
          </div>
          <div className="text-xs text-gray-600">
            Height represents total cost
          </div>
        </div>
      </div>

      {/* Info banner - data source placeholder */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 z-10">
        <div className="text-sm text-yellow-800">
          <span className="font-medium">Note:</span> Using mock data. Connect to CPDB Polygons dataset (9jkp-n57r) for actual project footprints.
        </div>
      </div>
    </div>
  );
}
