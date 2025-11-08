// ABOUTME: Housing timelapse map content without overlay shell
// ABOUTME: Embeddable version for use within MapsOverlay

import { useState, useEffect, useRef } from 'react';
import { Map3D } from '../HousingTimelapse/Map3D';
import { TimeSlider } from '../HousingTimelapse/TimeSlider';
import { Legend } from '../HousingTimelapse/Legend';
import { useHousingData } from '../../hooks/useHousingData';
import { getDefaultZoningColors } from '../../lib/data/housingDataProcessor';

const MIN_YEAR = 2010;
const MAX_YEAR = 2024;

type HousingTimelapseContentProps = {
  width: number;
  height: number;
};

export function HousingTimelapseContent({ width, height }: HousingTimelapseContentProps) {
  const [currentYear, setCurrentYear] = useState(MIN_YEAR);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackIntervalRef = useRef<number | null>(null);

  // Load housing data
  const {
    buildings,
    isLoading,
    error,
    totalBuildings,
    totalUnits,
    affordableUnits,
  } = useHousingData(currentYear);

  // Handle playback
  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / playbackSpeed;

      playbackIntervalRef.current = window.setInterval(() => {
        setCurrentYear((prev) => {
          if (prev >= MAX_YEAR) {
            setIsPlaying(false);
            return MAX_YEAR;
          }
          return prev + 1;
        });
      }, interval);
    } else {
      if (playbackIntervalRef.current !== null) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }

    return () => {
      if (playbackIntervalRef.current !== null) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleYearChange = (year: number) => {
    setCurrentYear(year);
    setIsPlaying(false);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const zoningColors = getDefaultZoningColors();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-slate-900 text-xl mb-2">Loading housing data...</div>
          <div className="text-slate-600">This may take a moment on first load</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-xl mb-2">Error Loading Data</div>
          <div className="text-slate-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        <Map3D
          buildings={buildings}
          currentYear={currentYear}
          zoningColors={zoningColors}
          width={width}
          height={height - 100} // Account for slider
        />
        <Legend
          zoningColors={zoningColors}
          currentYear={currentYear}
          totalBuildings={totalBuildings}
          totalUnits={totalUnits}
          affordableUnits={affordableUnits}
        />
      </div>
      <TimeSlider
        currentYear={currentYear}
        minYear={MIN_YEAR}
        maxYear={MAX_YEAR}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        onYearChange={handleYearChange}
        onPlayPause={handlePlayPause}
        onSpeedChange={handleSpeedChange}
      />
    </div>
  );
}
