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
  const layer = useMemo(() => {
    return new ColumnLayer({
      id: 'buildings-layer',
      data: buildings,
      diskResolution: 12,
      radius: 20,
      extruded: true,
      pickable: true,
      elevationScale: 4,
      getPosition: (d) => d.coordinates,
      getElevation: (d) => d.totalUnits,
      getFillColor: (d) => {
        // Color based on affordable housing percentage
        const percentage = d.affordablePercentage;
        if (percentage >= 80) {
          return [34, 197, 94]; // Green (high affordable)
        } else if (percentage >= 50) {
          return [59, 130, 246]; // Blue (moderate affordable)
        } else if (percentage >= 20) {
          return [251, 191, 36]; // Yellow (some affordable)
        } else {
          return [239, 68, 68]; // Red (low/no affordable)
        }
      },
      getLineColor: [255, 255, 255, 80],
      getLineWidth: 1,
      lineWidthMinPixels: 1,
      updateTriggers: {
        getFillColor: [currentYear],
        getElevation: [currentYear],
      },
      transitions: {
        getElevation: {
          type: 'spring',
          stiffness: 0.1,
          damping: 0.5,
          duration: 500,
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
  }, [buildings, currentYear]);

  // Tooltip for hovered building
  const renderTooltip = () => {
    if (!hoveredBuilding) {
      return null;
    }

    const building = buildings.find((b) => b.id === hoveredBuilding);
    if (!building) {
      return null;
    }

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
              <div>Affordable: {building.affordableUnits.toLocaleString()} ({building.affordablePercentage.toFixed(1)}%)</div>
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
        layers={[layer]}
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
