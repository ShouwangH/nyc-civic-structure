// ABOUTME: 3D map visualization component using deck.gl and maplibre for capital budget
// ABOUTME: Renders projects as columns (budget height) or footprints (actual geometry)

import { useMemo } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer, ColumnLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { Map3DProps, CapitalProjectFeature } from './types';

// NYC center coordinates
const INITIAL_VIEW_STATE = {
  longitude: -73.935,
  latitude: 40.73,
  zoom: 10,
  pitch: 45,
  bearing: 0,
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

// Color by managing agency
const AGENCY_COLORS: Record<string, [number, number, number]> = {
  DDC: [220, 38, 38], // red - Design & Construction (largest)
  DPR: [34, 197, 94], // green - Parks & Recreation
  EDC: [37, 99, 235], // blue - Economic Development
  CUNY: [234, 179, 8], // yellow - City University
  HHC: [168, 85, 247], // purple - Health & Hospitals
  DCLA: [236, 72, 153], // pink - Cultural Affairs
  DCAS: [20, 184, 166], // teal - Citywide Admin Services
  DOT: [249, 115, 22], // orange - Transportation
  HPD: [132, 204, 22], // lime - Housing Preservation
  DEP: [14, 165, 233], // sky blue - Environmental Protection
  TGI: [163, 163, 163], // gray - Governors Island
  NYPD: [30, 58, 138], // dark blue - Police
  FDNY: [185, 28, 28], // dark red - Fire
  BNY: [91, 33, 182], // deep purple - Brooklyn Navy Yard
  DHS: [217, 119, 6], // amber - Homeless Services
};

const DEFAULT_COLOR: [number, number, number] = [150, 150, 150]; // gray for others

// Small fixed height for footprint visibility (in deck.gl units)
const FOOTPRINT_HEIGHT = 30;

/**
 * Get color for project based on agency
 */
function getProjectColor(magencyacro: string): [number, number, number] {
  return AGENCY_COLORS[magencyacro] || DEFAULT_COLOR;
}

/**
 * 3D Map component with capital budget visualization
 */
export function Map3D({ projects, selectedProjectIds, viewMode, onHover, onClick }: Map3DProps) {
  // Create deck.gl layers
  const layers = useMemo(() => {
    const layerList = [];

    // Layer 1: Columns at project locations (height = budget)
    // In budget mode: show columns except selected ones (which show as footprints)
    // In footprint mode: don't show columns at all
    if (viewMode === 'budget') {
      const columnsLayer = new ColumnLayer({
        id: 'capital-columns',
        data: projects.filter((p) => !selectedProjectIds.has(p.properties.maprojid)),
        getPosition: (d: any) => d.centroid,
        diskResolution: 12,
        radius: 30,
        extruded: true,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 100],
        elevationScale: 0.5,
        getElevation: (d: any) => d.properties.allocate_total / 10000, // Scale budget to reasonable height
        getFillColor: (d: any) => {
          const color = getProjectColor(d.properties.magencyacro);
          return [...color, 200];
        },
        getLineColor: [80, 80, 80],
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        onHover: (info: PickingInfo) => {
          if (info.object) {
            onHover(info.object as CapitalProjectFeature);
          } else {
            onHover(null);
          }
        },
        onClick: (info: PickingInfo) => {
          if (info.object) {
            const project = info.object as any;
            onClick(project.properties.maprojid);
          }
        },
        updateTriggers: {
          getData: [selectedProjectIds],
        },
      } as any);

      layerList.push(columnsLayer);
    }

    // Layer 2: Footprint polygons
    // In budget mode: show footprints for selected projects only
    // In footprint mode: show all projects as footprints
    if (
      (viewMode === 'budget' && selectedProjectIds.size > 0) ||
      viewMode === 'footprint'
    ) {
      const footprintData =
        viewMode === 'budget'
          ? projects.filter((p) => selectedProjectIds.has(p.properties.maprojid))
          : projects;

      const footprintLayer = new GeoJsonLayer({
        id: 'capital-footprint',
        data: footprintData,
        filled: true,
        extruded: true,
        wireframe: true,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 100],
        elevationScale: 1,
        getElevation: FOOTPRINT_HEIGHT, // Small fixed height for visibility
        getFillColor: (d: any) => {
          const color = getProjectColor(d.properties.magencyacro);
          return [...color, 150]; // Slightly transparent
        },
        getLineColor: [60, 60, 60],
        lineWidthMinPixels: 2,
        onHover: (info: PickingInfo) => {
          if (info.object) {
            onHover(info.object as CapitalProjectFeature);
          } else {
            onHover(null);
          }
        },
        onClick:
          viewMode === 'budget'
            ? (info: PickingInfo) => {
                if (info.object) {
                  const project = info.object as any;
                  onClick(project.properties.maprojid);
                }
              }
            : undefined,
        transitions: {
          getElevation: {
            type: 'interpolation',
            duration: 300,
            easing: (t: number) => t * (2 - t), // ease-out
            enter: () => [0], // Start from 0 height
          },
          getFillColor: {
            type: 'interpolation',
            duration: 300,
            easing: (t: number) => t * (2 - t),
          },
        },
      } as any);

      layerList.push(footprintLayer);
    }

    return layerList;
  }, [projects, selectedProjectIds, viewMode, onHover, onClick]);

  return (
    <DeckGL
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
      layers={layers}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <Map mapStyle={MAP_STYLE} style={{ width: '100%', height: '100%' }} />
    </DeckGL>
  );
}

// Export agency colors for legend
export { AGENCY_COLORS };
