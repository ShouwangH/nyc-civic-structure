// ABOUTME: 3D map visualization component using deck.gl and maplibre
// ABOUTME: Renders buildings as extruded columns with height based on housing units

import { useMemo, useState } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { ColumnLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Map3DProps, BuildingSegment } from './types';
import { createBuildingSegments } from '../../lib/data/housingDataProcessor';

// NYC center coordinates
const INITIAL_VIEW_STATE = {
  longitude: -73.935242,
  latitude: 40.730610,
  zoom: 11,
  pitch: 45,
  bearing: 0,
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/**
 * 3D Map component with building extrusions
 */
export function Map3D({ buildings, currentYear, width, height }: Map3DProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);

  // Create deck.gl layer
  // Use integer year for stable transitions
  const displayYear = Math.floor(currentYear);

  // Transform buildings into stacked segments
  const segments = useMemo(() => createBuildingSegments(buildings), [buildings]);

  // Create layers for stacked visualization
  // We need separate layers for affordable (bottom) and market (top) segments
  const layers = useMemo(() => {
    // Affordable segments (rendered from ground)
    const affordableLayer = new ColumnLayer({
      id: 'affordable-segments',
      data: segments.filter((s) => s.segmentType === 'affordable'),
      getPosition: (d: BuildingSegment) => d.parentBuilding.coordinates,
      diskResolution: 12,
      radius: 20,
      extruded: true,
      pickable: true,
      elevationScale: 4,
      // Conditionally show based on parent building completion year
      getElevation: (d: BuildingSegment) =>
        d.parentBuilding.completionYear <= displayYear ? d.segmentHeight : 0,
      getFillColor: (d: BuildingSegment) => d.color,
      getLineColor: [255, 255, 255, 80],
      getLineWidth: 1,
      lineWidthMinPixels: 1,
      updateTriggers: {
        getElevation: [displayYear],
      },
      transitions: {
        getElevation: {
          type: 'interpolation',
          duration: 1000,
          easing: (t: number) => t * (2 - t),
          enter: (_value: number[]) => [0],
        },
      },
      onHover: (info: PickingInfo) => {
        if (info.object) {
          setHoveredBuilding((info.object as BuildingSegment).buildingId);
        } else {
          setHoveredBuilding(null);
        }
      },
    });

    // Market-rate segments (need to be visually stacked on top)
    // Note: ColumnLayer doesn't support baseElevation natively
    // This is a limitation - segments render from ground level
    // For now, we offset horizontally slightly to show both segments
    const marketLayer = new ColumnLayer({
      id: 'market-segments',
      data: segments.filter((s) => s.segmentType === 'market-rate'),
      getPosition: (d: BuildingSegment) => {
        // Slight horizontal offset to show market segment next to affordable
        const [lon, lat] = d.parentBuilding.coordinates;
        return [lon + 0.0001, lat]; // Small offset in longitude
      },
      diskResolution: 12,
      radius: 20,
      extruded: true,
      pickable: true,
      elevationScale: 4,
      getElevation: (d: BuildingSegment) =>
        d.parentBuilding.completionYear <= displayYear ? d.segmentHeight : 0,
      getFillColor: (d: BuildingSegment) => d.color,
      getLineColor: [255, 255, 255, 80],
      getLineWidth: 1,
      lineWidthMinPixels: 1,
      updateTriggers: {
        getElevation: [displayYear],
      },
      transitions: {
        getElevation: {
          type: 'interpolation',
          duration: 1000,
          easing: (t: number) => t * (2 - t),
          enter: (_value: number[]) => [0],
        },
      },
      onHover: (info: PickingInfo) => {
        if (info.object) {
          setHoveredBuilding((info.object as BuildingSegment).buildingId);
        } else {
          setHoveredBuilding(null);
        }
      },
    });

    return [affordableLayer, marketLayer];
  }, [segments, displayYear]);

  // Tooltip for hovered building
  const renderTooltip = () => {
    if (!hoveredBuilding) {
      return null;
    }

    const building = buildings.find((b) => b.id === hoveredBuilding);
    if (!building) {
      return null;
    }

    const hasMixedUnits = building.affordableUnits > 0 && building.affordableUnits < building.totalUnits;
    const marketUnits = building.totalUnits - building.affordableUnits;

    return (
      <div
        className="absolute z-10 pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="bg-white rounded-lg shadow-lg p-3 border border-slate-200 max-w-xs">
          <div className="font-semibold text-slate-900 text-sm mb-1">{building.name}</div>
          <div className="text-xs text-slate-600 space-y-0.5">
            <div>{building.address}</div>
            <div>{building.borough}</div>
            <div className="pt-1 border-t border-slate-200 mt-1">
              <div>Total Units: {building.totalUnits.toLocaleString()}</div>
              {hasMixedUnits ? (
                <>
                  <div className="ml-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                    Affordable: {building.affordableUnits.toLocaleString()} ({building.affordablePercentage.toFixed(1)}%)
                  </div>
                  <div className="ml-2">
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{
                      backgroundColor: `rgb(${building.buildingType === 'multifamily-elevator' ? '59, 130, 246' :
                        building.buildingType === 'multifamily-walkup' ? '147, 51, 234' :
                        building.buildingType === 'mixed-use' ? '251, 191, 36' :
                        building.buildingType === 'one-two-family' ? '239, 68, 68' : '156, 163, 175'})`
                    }}></span>
                    Market-rate: {marketUnits.toLocaleString()} ({((marketUnits / building.totalUnits) * 100).toFixed(1)}%)
                  </div>
                </>
              ) : (
                <div>Affordable: {building.affordableUnits.toLocaleString()} ({building.affordablePercentage.toFixed(1)}%)</div>
              )}
              <div>Completed: {building.completionYear}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: `${width}px`, height: `${height}px`, position: 'relative' }}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        style={{ position: 'absolute', width: `${width}px`, height: `${height}px` }}
      >
        <Map
          mapStyle={MAP_STYLE}
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      </DeckGL>
      {renderTooltip()}
    </div>
  );
}
