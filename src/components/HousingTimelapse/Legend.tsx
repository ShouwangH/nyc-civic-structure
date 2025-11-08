// ABOUTME: Legend component displaying color coding and statistics
// ABOUTME: Shows affordable housing percentage legend and current year statistics

import type { LegendProps } from './types';

/**
 * Legend and statistics panel
 */
export function Legend({
  currentYear,
  totalBuildings,
  totalUnits,
  affordableUnits,
}: LegendProps) {
  const affordablePercentage = totalUnits > 0 ? (affordableUnits / totalUnits) * 100 : 0;

  return (
    <div className="absolute top-6 left-6 z-10 bg-white rounded-xl border border-slate-200 shadow-lg p-4 max-w-xs">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">
        Housing Development Through {currentYear}
      </h3>

      {/* Statistics */}
      <div className="space-y-2 mb-4 pb-4 border-b border-slate-200">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Buildings:</span>
          <span className="font-semibold text-slate-900">{totalBuildings.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Total Units:</span>
          <span className="font-semibold text-slate-900">{totalUnits.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Affordable Units:</span>
          <span className="font-semibold text-slate-900">
            {affordableUnits.toLocaleString()} ({affordablePercentage.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Color legend */}
      <div>
        <div className="text-xs font-semibold text-slate-700 mb-2">
          Building Type
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(34, 197, 94)' }}></div>
            <span className="text-xs text-slate-600">Affordable Housing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(59, 130, 246)' }}></div>
            <span className="text-xs text-slate-600">Multifamily Elevator</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(147, 51, 234)' }}></div>
            <span className="text-xs text-slate-600">Multifamily Walkup</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(251, 191, 36)' }}></div>
            <span className="text-xs text-slate-600">Mixed Use</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(239, 68, 68)' }}></div>
            <span className="text-xs text-slate-600">1-2 Family Homes</span>
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
          <strong>New construction only (2014-2024)</strong><br />
          Data: NYC Open Data<br />
          • Housing New York Units by Building<br />
          • PLUTO (Primary Land Use Tax Lot Output)
        </div>
      </div>
    </div>
  );
}
