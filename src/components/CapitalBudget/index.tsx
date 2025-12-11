// ABOUTME: Main capital budget visualization component
// ABOUTME: Combines Map3D, Legend, and Tooltip for complete visualization experience

import { useState, useMemo } from 'react';
import { Map3D, AGENCY_COLORS } from './Map3D';
import { Legend } from './Legend';
import { Tooltip } from './Tooltip';
import { useCapitalBudgetData } from '../../hooks/useCapitalBudgetData';
import type {
  CapitalBudgetProps,
  CapitalProjectFeature,
  CapitalProjectWithCentroid,
  ViewMode,
} from './types';
import type { Polygon, MultiPolygon } from 'geojson';

/**
 * Calculate centroid of a polygon or multipolygon
 * Used as fallback when pre-computed centroid is not available
 */
function calculateCentroid(geometry: Polygon | MultiPolygon): [number, number] {
  let totalX = 0;
  let totalY = 0;
  let totalPoints = 0;

  const processRing = (ring: number[][]) => {
    ring.forEach(([lon, lat]) => {
      totalX += lon;
      totalY += lat;
      totalPoints++;
    });
  };

  if (geometry.type === 'Polygon') {
    // Process outer ring only
    processRing(geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    // Process outer ring of each polygon
    geometry.coordinates.forEach((polygon) => {
      processRing(polygon[0]);
    });
  }

  return [totalX / totalPoints, totalY / totalPoints];
}

/**
 * Get centroid for a project, preferring pre-computed values from API
 */
function getCentroid(project: CapitalProjectFeature): [number, number] {
  const { centroid_lon, centroid_lat } = project.properties;

  // Use pre-computed centroid if available (much faster)
  if (centroid_lon != null && centroid_lat != null) {
    return [centroid_lon, centroid_lat];
  }

  // Fallback to runtime calculation for backwards compatibility
  return calculateCentroid(project.geometry as Polygon | MultiPolygon);
}

/**
 * Capital budget visualization component
 */
export function CapitalBudget({}: CapitalBudgetProps) {
  const [hoveredProject, setHoveredProject] = useState<CapitalProjectFeature | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('budget');

  // Load capital budget data
  const { projects, isLoading, error } = useCapitalBudgetData();

  // Transform projects to include centroids for column layer
  // Uses pre-computed centroids from API when available (much faster)
  const projectsWithCentroids = useMemo<CapitalProjectWithCentroid[]>(() => {
    return projects.map((project) => {
      const centroid = getCentroid(project);
      // Add small random offset to prevent overlapping columns at same location
      // 0.0002 degrees ≈ 22 meters at NYC latitude
      const offsetLon = (Math.random() - 0.5) * 0.0002;
      const offsetLat = (Math.random() - 0.5) * 0.0002;
      return {
        ...project,
        centroid: [centroid[0] + offsetLon, centroid[1] + offsetLat] as [number, number],
      };
    });
  }, [projects]);

  const handleHover = (project: CapitalProjectFeature | null) => {
    setHoveredProject(project);
  };

  const handleClick = (projectId: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
          <div className="text-center">
            <div className="text-slate-900 text-xl mb-2">Loading capital projects...</div>
            <div className="text-slate-600">Fetching from database</div>
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

      {!isLoading && !error && (
        <>
          <Map3D
            projects={projectsWithCentroids}
            selectedProjectIds={selectedProjectIds}
            viewMode={viewMode}
            onHover={handleHover}
            onClick={handleClick}
          />
          <Tooltip project={hoveredProject} />
          <Legend
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            agencyColors={AGENCY_COLORS}
          />
        </>
      )}
    </div>
  );
}
