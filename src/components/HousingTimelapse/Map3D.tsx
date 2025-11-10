// ABOUTME: 3D map visualization component using deck.gl and maplibre
// ABOUTME: Renders buildings as extruded columns with height based on housing units

import { useMemo, useState } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { ColumnLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Map3DProps } from './types';

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

  // Two-layer approach for stacking:
  // 1. Bottom layer: Full buildings colored by physical type
  // 2. Top layer: Affordable segments (green overlay) - renders on top
  const layers = useMemo(() => {
    // Layer 1: All buildings at full height, colored by physical building type
    const buildingsLayer = new ColumnLayer({
      id: 'buildings-full',
      data: buildings,
      getPosition: (d) => d.coordinates,
      diskResolution: 12,
      radius: 20,
      extruded: true,
      pickable: true,
      elevationScale: 4,
      getElevation: (d) => d.completionYear <= displayYear ? d.totalUnits : 0,
      getFillColor: (d) => {
        // Color by physical building type
        switch (d.physicalBuildingType) {
          case 'multifamily-elevator':
            return [59, 130, 246, 200]; // Blue
          case 'multifamily-walkup':
            return [147, 51, 234, 200]; // Purple
          case 'mixed-use':
            return [251, 191, 36, 200]; // Yellow
          case 'one-two-family':
            return [239, 68, 68, 200]; // Red
          default:
            return [156, 163, 175, 200]; // Gray - Unknown
        }
      },
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
          setHoveredBuilding(info.object.id);
        } else {
          setHoveredBuilding(null);
        }
      },
    });

    // Layer 2: Affordable segments (green) rendered on top
    // This creates the stacked effect: green from 0 to affordableUnits
    const affordableLayer = new ColumnLayer({
      id: 'affordable-overlay',
      data: buildings.filter((b) => b.affordableUnits > 0),
      getPosition: (d) => d.coordinates,
      diskResolution: 12,
      radius: 20,
      extruded: true,
      pickable: true,
      elevationScale: 4,
      getElevation: (d) => d.completionYear <= displayYear ? d.affordableUnits : 0,
      getFillColor: [34, 197, 94, 200], // Green for affordable
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
          setHoveredBuilding(info.object.id);
        } else {
          setHoveredBuilding(null);
        }
      },
    });

    return [buildingsLayer, affordableLayer];
  }, [buildings, displayYear]);

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
                      backgroundColor: `rgb(${building.physicalBuildingType === 'multifamily-elevator' ? '59, 130, 246' :
                        building.physicalBuildingType === 'multifamily-walkup' ? '147, 51, 234' :
                        building.physicalBuildingType === 'mixed-use' ? '251, 191, 36' :
                        building.physicalBuildingType === 'one-two-family' ? '239, 68, 68' : '156, 163, 175'})`
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
