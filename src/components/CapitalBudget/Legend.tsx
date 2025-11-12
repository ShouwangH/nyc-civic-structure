// ABOUTME: Legend component for capital budget visualization
// ABOUTME: Shows agency colors, view mode toggle, and interaction instructions

import type { LegendProps } from './types';

/**
 * Legend component with agency colors and view mode controls
 */
export function Legend({ viewMode, onViewModeChange, agencyColors }: LegendProps) {
  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-10">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-gray-900">Capital Projects</div>
        <div className="inline-flex rounded-lg bg-slate-200 border border-slate-300 p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange('budget')}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
              viewMode === 'budget'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-300'
            }`}
          >
            Budget
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('footprint')}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
              viewMode === 'footprint'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-300'
            }`}
          >
            Footprint
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-600 mb-3">
        Click column to show footprint. Click footprint to return to column view.
      </div>
      <div className="font-semibold text-gray-900 mb-2 text-sm">Top Agencies</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {Object.entries(agencyColors)
          .slice(0, 10)
          .map(([agency, color]) => (
            <div key={agency} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ backgroundColor: `rgb(${color.join(',')})` }}
              />
              <span className="truncate">{agency}</span>
            </div>
          ))}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          <strong>Column Height:</strong> Allocated Budget
        </div>
      </div>
    </div>
  );
}
