// ABOUTME: Wrapper component for map visualizations with dropdown selector
// ABOUTME: Allows switching between housing timelapse and capital budget maps

import { useState, useRef, useEffect } from 'react';
import { HousingTimelapseContent } from './HousingTimelapseContent';
import { CapitalBudget } from '../CapitalBudget';

type MapType = 'housing' | 'capital-budget';

type MapOption = {
  id: MapType;
  label: string;
  description: string;
};

const MAP_OPTIONS: MapOption[] = [
  {
    id: 'housing',
    label: 'Housing Development Timelapse',
    description: 'Visualization of housing construction (2014-2024)',
  },
  {
    id: 'capital-budget',
    label: 'Capital Budget Projects',
    description: 'Pending capital projects by borough and budget',
  },
];

type MapsOverlayProps = {
  onClose: () => void;
};

export function MapsOverlay({ onClose }: MapsOverlayProps) {
  const [selectedMap, setSelectedMap] = useState<MapType>('housing');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const selectedOption = MAP_OPTIONS.find((opt) => opt.id === selectedMap) || MAP_OPTIONS[0];

  // Calculate overlay dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const overlayWidth = viewportWidth * 0.95;
  const overlayHeight = viewportHeight * 0.95;

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex-1">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 transition"
              >
                <span>{selectedOption.label}</span>
                <svg
                  className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg z-10">
                  <div className="py-2">
                    {MAP_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedMap(option.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left transition ${
                          selectedMap === option.id
                            ? 'bg-blue-50 border-l-4 border-blue-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`font-medium ${selectedMap === option.id ? 'text-blue-700' : 'text-slate-900'}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 mt-1">{selectedOption.description}</p>
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

        <div className="flex-1 overflow-hidden relative">
          {selectedMap === 'housing' && (
            <HousingTimelapseContent
              width={overlayWidth}
              height={overlayHeight - 80}
            />
          )}
          {selectedMap === 'capital-budget' && (
            <CapitalBudget />
          )}
        </div>
      </div>
    </div>
  );
}
