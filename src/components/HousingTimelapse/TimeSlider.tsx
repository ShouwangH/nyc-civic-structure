// ABOUTME: Timeline slider component for housing timelapse visualization
// ABOUTME: Controls year selection, playback, and animation speed

import type { TimeSliderProps } from './types';

/**
 * Timeline slider with playback controls
 */
export function TimeSlider({
  currentYear,
  minYear,
  maxYear,
  isPlaying,
  playbackSpeed,
  buildings,
  onYearChange,
  onPlayPause,
  onSpeedChange,
}: TimeSliderProps) {
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const year = parseInt(event.target.value, 10);
    onYearChange(year);
  };

  const handleSpeedChange = (speed: number) => {
    onSpeedChange(speed);
  };

  // Calculate month range for current year
  const displayYear = Math.floor(currentYear);

  const getMonthRange = () => {
    if (!buildings || buildings.length === 0) {
      return null;
    }

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    // Get buildings from current year with month data
    const yearBuildings = buildings.filter(
      b => b.completionYear === displayYear && b.completionMonth
    );

    if (yearBuildings.length === 0) {
      return null;
    }

    const months = yearBuildings.map(b => b.completionMonth!).sort((a, b) => a - b);
    const minMonth = months[0];
    const maxMonth = months[months.length - 1];

    if (minMonth === maxMonth) {
      return monthNames[minMonth - 1];
    }

    return `${monthNames[minMonth - 1]} - ${monthNames[maxMonth - 1]}`;
  };

  const monthRange = getMonthRange();

  return (
    <div className="flex flex-col gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
      {/* Year display */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-2xl font-bold text-slate-900">{displayYear}</div>
          {monthRange && (
            <div className="text-sm text-slate-500">{monthRange}</div>
          )}
        </div>
        <div className="text-sm text-slate-600">
          {minYear} - {maxYear}
        </div>
      </div>

      {/* Slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 font-medium">{minYear}</span>
        <input
          type="range"
          min={minYear}
          max={maxYear}
          step="0.01"
          value={currentYear}
          onChange={handleSliderChange}
          className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
              ((currentYear - minYear) / (maxYear - minYear)) * 100
            }%, #e2e8f0 ${
              ((currentYear - minYear) / (maxYear - minYear)) * 100
            }%, #e2e8f0 100%)`,
          }}
        />
        <span className="text-xs text-slate-500 font-medium">{maxYear}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Play/Pause button */}
        <button
          type="button"
          onClick={onPlayPause}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {isPlaying ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
              <span>Pause</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>Play</span>
            </>
          )}
        </button>

        {/* Speed controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-medium">Speed:</span>
          <div className="flex gap-1">
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => handleSpeedChange(speed)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Step buttons */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onYearChange(Math.max(minYear, currentYear - 1))}
            disabled={currentYear === minYear}
            className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onYearChange(Math.min(maxYear, currentYear + 1))}
            disabled={currentYear === maxYear}
            className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
