// ABOUTME: Legend component displaying color coding and statistics
// ABOUTME: Shows building type legend with unit counts and data sources

import type { LegendProps } from './types';
import type { ProcessedBuilding } from './types';

/**
 * Legend and statistics panel
 */
export function Legend({
  currentYear,
  buildings,
  netNewUnits,
}: LegendProps & { buildings?: ProcessedBuilding[]; netNewUnits?: number }) {
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

  // Debug logging
  console.group('Legend Debug - Building Type Counts');
  console.log('Total buildings:', buildingsUpToYear.length);
  console.log('Building type counts:', buildingTypeCounts);

  // Count affordable units separately
  const totalAffordableUnits = buildingsUpToYear.reduce((sum, b) => sum + b.affordableUnits, 0);
  console.log('Total affordable units (sum of all affordableUnits):', totalAffordableUnits);

  // Count buildings by physicalBuildingType
  const physicalTypeCounts = buildingsUpToYear.reduce((acc, building) => {
    const type = building.physicalBuildingType;
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += building.totalUnits;
    return acc;
  }, {} as Record<string, number>);
  console.log('Physical building type counts:', physicalTypeCounts);

  // Check for unknown/gray buildings
  const unknownBuildings = buildingsUpToYear.filter(b =>
    b.physicalBuildingType === 'unknown' || !b.physicalBuildingType
  );
  console.log('Unknown/gray buildings:', unknownBuildings.length);
  if (unknownBuildings.length > 0) {
    console.log('Sample unknown buildings:', unknownBuildings.slice(0, 5).map(b => ({
      id: b.id,
      buildingType: b.buildingType,
      physicalBuildingType: b.physicalBuildingType,
      buildingClass: b.buildingClass,
      address: b.address
    })));
  }
  console.groupEnd();

  // Check if any PLUTO data is being used (from filtered buildings)
  const usesPluto = buildingsUpToYear.some(b => b.dataSource === 'pluto');

  // Calculate gross units (sum of all totalUnits)
  const grossUnits = buildingsUpToYear.reduce((sum, b) => sum + b.totalUnits, 0);

  return (
    <div className="absolute bottom-6 right-6 z-10 bg-white rounded-xl border border-slate-200 shadow-lg p-4 max-w-xs">
      {/* Summary statistics */}
      <div className="mb-3 pb-3 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600">Gross New Units</span>
            <span className="text-xs font-semibold text-slate-900">
              {grossUnits.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600">Net New Units</span>
            <span className="text-xs font-semibold text-slate-900">
              {(netNewUnits ?? grossUnits).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(34, 197, 94)' }}></div>
              <span className="text-xs text-slate-600">Affordable Units</span>
            </div>
            <span className="text-xs font-semibold text-green-600">
              {totalAffordableUnits.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div>
        <div className="text-xs font-semibold text-slate-700 mb-2">
          Building Type
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(59, 130, 246)' }}></div>
              <span className="text-xs text-slate-600">Multifamily Elevator</span>
            </div>
            <span className="text-xs font-medium text-slate-700">
              {(physicalTypeCounts['multifamily-elevator'] || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(147, 51, 234)' }}></div>
              <span className="text-xs text-slate-600">Multifamily Walkup</span>
            </div>
            <span className="text-xs font-medium text-slate-700">
              {(physicalTypeCounts['multifamily-walkup'] || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(251, 191, 36)' }}></div>
              <span className="text-xs text-slate-600">Mixed Use</span>
            </div>
            <span className="text-xs font-medium text-slate-700">
              {(physicalTypeCounts['mixed-use'] || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(239, 68, 68)' }}></div>
              <span className="text-xs text-slate-600">1-2 Family Homes</span>
            </div>
            <span className="text-xs font-medium text-slate-700">
              {(physicalTypeCounts['one-two-family'] || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Height legend */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="text-xs text-slate-600">
          <strong>Height</strong> = Total housing units in building
        </div>
        <div className="text-xs text-slate-600 mt-1">
          Buildings colored by type; affordable units shown as green overlay from base
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
