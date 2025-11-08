// ABOUTME: School funding per student 3D map visualization
// ABOUTME: Shows NYC public schools as extruded points based on funding per student

import { useState } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { ColumnLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import { scaleSequential } from 'd3-scale';
import { interpolateViridis } from 'd3-scale-chromatic';
import { useSchoolFundingData, type SchoolBudgetFeature } from '../../hooks/useSchoolFundingData';

const INITIAL_VIEW_STATE = {
  longitude: -73.935,
  latitude: 40.73,
  zoom: 10,
  pitch: 45,
  bearing: 0,
};

type ColorScale = 'linear' | 'quantile' | 'log';

/**
 * Get color based on normalized funding using selected scale
 */
function getColorForFunding(
  normalizedFunding: number,
  scale: ColorScale,
  minFunding: number,
  maxFunding: number,
  actualFunding: number
): [number, number, number, number] {
  let t: number;

  switch (scale) {
    case 'quantile':
      // Quantile scale - equal number of items per color bin
      t = normalizedFunding;
      break;
    case 'log':
      // Log scale - for highlighting differences at lower values
      if (maxFunding === minFunding || actualFunding <= 0) {
        t = 0.5;
      } else {
        const logMin = Math.log10(Math.max(1, minFunding));
        const logMax = Math.log10(Math.max(1, maxFunding));
        const logValue = Math.log10(Math.max(1, actualFunding));
        t = (logValue - logMin) / (logMax - logMin);
      }
      break;
    case 'linear':
    default:
      // Linear scale - direct mapping
      t = normalizedFunding;
      break;
  }

  // Use Viridis color scale (perceptually uniform, colorblind-friendly)
  const color = scaleSequential(interpolateViridis).domain([0, 1])(t);

  // Parse rgb string "rgb(r, g, b)"
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), 200];
  }

  // Fallback
  return [150, 150, 150, 200];
}

export function SchoolFundingMap() {
  const { schools, isLoading, error } = useSchoolFundingData();
  const [hoveredSchool, setHoveredSchool] = useState<SchoolBudgetFeature | null>(null);
  const [colorScale, setColorScale] = useState<ColorScale>('linear');

  // Calculate min/max for log scale
  const minFunding = schools.length > 0
    ? Math.min(...schools.map(s => s.properties.funding_per_student))
    : 0;
  const maxFunding = schools.length > 0
    ? Math.max(...schools.map(s => s.properties.funding_per_student))
    : 0;

  const layer = new ColumnLayer<SchoolBudgetFeature>({
    id: 'school-funding',
    data: schools,
    diskResolution: 12,
    radius: 50,
    extruded: true,
    pickable: true,
    elevationScale: 4,
    getPosition: (d) => {
      const coords = d.geometry.coordinates as [number, number];
      return [coords[0], coords[1], 0];
    },
    getElevation: (d) => d.properties.funding_per_student,
    getFillColor: (d) => getColorForFunding(
      d.properties.normalized_funding,
      colorScale,
      minFunding,
      maxFunding,
      d.properties.funding_per_student
    ),
    getLineColor: [80, 80, 80],
    lineWidthMinPixels: 1,
    onHover: (info: PickingInfo<SchoolBudgetFeature>) => {
      if (info.object) {
        setHoveredSchool(info.object);
      } else {
        setHoveredSchool(null);
      }
    },
    updateTriggers: {
      getFillColor: [colorScale, minFunding, maxFunding],
    },
  });

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <div className="text-center">
            <div className="text-slate-900 text-xl mb-2">Loading school funding data...</div>
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
      {hoveredSchool && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-10">
          <div className="font-semibold text-gray-900">{hoveredSchool.properties.school_name}</div>
          <div className="text-sm text-gray-600 mt-1">
            <div><span className="font-medium">DBN:</span> {hoveredSchool.properties.dbn}</div>
            <div><span className="font-medium">Total Budget:</span> ${(hoveredSchool.properties.total_budget / 1000000).toFixed(2)}M</div>
            <div><span className="font-medium">Enrollment:</span> {hoveredSchool.properties.enrollment.toLocaleString()} students</div>
            <div className="mt-2 pt-2 border-t border-gray-200">
              <span className="font-medium">Funding per Student:</span> ${hoveredSchool.properties.funding_per_student.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      )}

      {/* Color scale selector */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
        <div className="font-semibold text-gray-900 mb-2">Color Scale</div>
        <div className="space-y-1">
          {(['linear', 'quantile', 'log'] as ColorScale[]).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => setColorScale(scale)}
              className={`w-full px-3 py-2 text-sm rounded transition ${
                colorScale === scale
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {scale.charAt(0).toUpperCase() + scale.slice(1)}
            </button>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
          <div><strong>Height:</strong> Funding per student</div>
          <div><strong>Color:</strong> Relative funding level</div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-10">
        <div className="font-semibold text-gray-900 mb-2">Funding Range</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Min:</span>
            <span className="font-medium">${minFunding.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Max:</span>
            <span className="font-medium">${maxFunding.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          {schools.length > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-gray-200">
              <span className="text-gray-600">Average:</span>
              <span className="font-medium">
                ${(schools.reduce((sum, s) => sum + s.properties.funding_per_student, 0) / schools.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <strong>Note:</strong> Outliers above 95th percentile excluded
          </div>
        </div>
      </div>

      {/* Info banner - data source */}
      {!isLoading && !error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 z-10">
          <div className="text-sm text-blue-800">
            <span className="font-medium">Live Data:</span> NYC School Budgets FY2025 - {schools.length} schools loaded
          </div>
        </div>
      )}
    </div>
  );
}
