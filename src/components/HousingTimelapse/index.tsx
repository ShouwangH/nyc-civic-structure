// ABOUTME: Main housing timelapse overlay component
// ABOUTME: Combines Map3D, TimeSlider, and Legend for complete visualization experience

import { useState, useEffect, useRef } from 'react';
import { Map3D } from './Map3D';
import { TimeSlider } from './TimeSlider';
import { Legend } from './Legend';
import { useHousingData } from '../../hooks/useHousingData';
import { getDefaultZoningColors } from '../../lib/data/housingDataProcessor';
import type { HousingTimelapseProps } from './types';

const MIN_YEAR = 2014;
const MAX_YEAR = 2024;

/**
 * Housing timelapse overlay component
 */
export function HousingTimelapse({ onClose }: HousingTimelapseProps) {
  const [currentYear, setCurrentYear] = useState(MIN_YEAR);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const currentYearFloatRef = useRef<number>(MIN_YEAR);

  // Load housing data - use Math.floor to get integer year for filtering
  const displayYear = Math.floor(currentYear);
  const {
    buildings,
    isLoading,
    error,
    totalBuildings,
    totalUnits,
    affordableUnits,
  } = useHousingData(displayYear);

  // Handle smooth playback using requestAnimationFrame
  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = performance.now();
      currentYearFloatRef.current = currentYear;

      const animate = (timestamp: number) => {
        const deltaTime = timestamp - lastFrameTimeRef.current;
        lastFrameTimeRef.current = timestamp;

        // Increment based on playbackSpeed (1x = 1 year per second)
        // deltaTime is in milliseconds, so divide by 1000
        const increment = (deltaTime / 1000) * playbackSpeed;
        currentYearFloatRef.current += increment;

        if (currentYearFloatRef.current >= MAX_YEAR) {
          currentYearFloatRef.current = MAX_YEAR;
          setCurrentYear(MAX_YEAR);
          setIsPlaying(false);
        } else {
          setCurrentYear(currentYearFloatRef.current);
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, currentYear]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleYearChange = (year: number) => {
    setCurrentYear(year);
    currentYearFloatRef.current = year;
    setIsPlaying(false);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Calculate overlay dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const overlayWidth = viewportWidth * 0.95;
  const overlayHeight = viewportHeight * 0.95;

  const zoningColors = getDefaultZoningColors();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{
          width: `${overlayWidth}px`,
          height: `${overlayHeight}px`,
          maxWidth: '95vw',
          maxHeight: '95vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              NYC Housing Development Timelapse
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              2.5D visualization of housing construction (2010-2024)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-md hover:bg-gray-100"
            aria-label="Close overlay"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden relative">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-slate-900 text-xl mb-2">Loading housing data...</div>
                <div className="text-slate-600">This may take a moment on first load</div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-red-600 text-xl mb-2">Error Loading Data</div>
                <div className="text-slate-700">{error}</div>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <>
              <Map3D
                buildings={buildings}
                currentYear={displayYear}
                zoningColors={zoningColors}
                width={overlayWidth}
                height={overlayHeight - 200} // Account for header and slider
              />
              <Legend
                zoningColors={zoningColors}
                currentYear={displayYear}
                totalBuildings={totalBuildings}
                totalUnits={totalUnits}
                affordableUnits={affordableUnits}
              />
            </>
          )}
        </div>

        {/* Timeline controls */}
        {!isLoading && !error && (
          <TimeSlider
            currentYear={currentYear}
            minYear={MIN_YEAR}
            maxYear={MAX_YEAR}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            buildings={buildings}
            onYearChange={handleYearChange}
            onPlayPause={handlePlayPause}
            onSpeedChange={handleSpeedChange}
          />
        )}
      </div>
    </div>
  );
}
