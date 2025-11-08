// ABOUTME: Legend component displaying color coding and statistics
// ABOUTME: Shows building type legend with unit counts and data sources

import type { LegendProps } from './types';
import type { ProcessedBuilding } from './types';

/**
 * Legend and statistics panel
 */
export function Legend({
  currentYear,
  totalBuildings,
  totalUnits,
  affordableUnits,
  buildings,
}: LegendProps & { buildings?: ProcessedBuilding[] }) {
  // Filter buildings up to current year (for updating counts as timeline moves)
  const buildingsUpToYear = buildings?.filter(b => b.completionYear <= currentYear) || [];

  // Calculate unit counts by building type from filtered buildings
  const buildingTypeCounts = buildingsUpToYear.reduce((acc, building) => {
    const type = building.buildingType;
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += building.totalUnits;
    return acc;
  }, {} as Record<string, number>);

  // Check if any PLUTO data is being used (from filtered buildings)
  const usesPluto = buildingsUpToYear.some(b => b.dataSource === 'pluto');

  return (
    <div className="absolute bottom-6 right-6 z-10 bg-white rounded-xl border border-slate-200 shadow-lg p-4 max-w-xs">
      {/* Color legend */}
      <div>
        <div className="text-xs font-semibold text-slate-700 mb-2">
          Building Type
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(34, 197, 94)' }}></div>
              <span className="text-xs text-slate-600">Affordable Housing</span>
            </div>
            <span className="text-xs font-medium text-slate-700">
              {(buildingTypeCounts['affordable'] || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(249, 115, 22)' }}></div>
              <span className="text-xs text-slate-600">Major Renovation</span>
            </div>
            <span className="text-xs font-medium text-slate-700">
              {(buildingTypeCounts['renovation'] || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(59, 130, 246)' }}></div>
              <span className="text-xs text-slate-600">Multifamily Elevator</span>
            </div>
            <span className="text-xs font-medium text-slate-700">
              {(buildingTypeCounts['multifamily-elevator'] || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(147, 51, 234)' }}></div>
              <span className="text-xs text-slate-600">Multifamily Walkup</span>
            </div>
            <span className="text-xs font-medium text-slate-700">
              {(buildingTypeCounts['multifamily-walkup'] || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(251, 191, 36)' }}></div>
              <span className="text-xs text-slate-600">Mixed Use</span>
            </div>
            <span className="text-xs font-medium text-slate-700">
              {(buildingTypeCounts['mixed-use'] || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(239, 68, 68)' }}></div>
              <span className="text-xs text-slate-600">1-2 Family Homes</span>
            </div>
            <span className="text-xs font-medium text-slate-700">
              {(buildingTypeCounts['one-two-family'] || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Height legend */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="text-xs text-slate-600">
          <strong>Height</strong> = Total housing units in building
        </div>
      </div>

      {/* Data source */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          <strong>New construction + renovations (2014-2024)</strong><br />
          Data: NYC Open Data<br />
          • DOB Job Applications (primary)<br />
          • Housing New York Units by Building
          {usesPluto && <><br />• PLUTO (fallback)</>}
        </div>
      </div>
    </div>
  );
}
