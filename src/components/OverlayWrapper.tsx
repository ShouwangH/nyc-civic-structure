// ABOUTME: Wrapper component for displaying visualization overlays
// ABOUTME: Header includes dropdown to select from all available Sankey and Sunburst visualizations

import { useState, useRef, useEffect } from 'react';
import { SankeyOverlay } from './SankeyOverlay';
import { SunburstOverlay } from './SunburstOverlay';
import type { SubviewDefinition } from '../data/types';
import type { InputHandler } from '../visualization/cytoscape/inputHandler';
import { actions } from '../visualization/cytoscape/actions';
import type { SankeyData } from '../visualization/sankey/types';
import type { SunburstData } from '../visualization/sunburst/types';

type OverlayWrapperProps = {
  overlaySubviews: SubviewDefinition[];
  inputHandler: InputHandler | null;
};

const OverlayWrapper = ({
  overlaySubviews,
  inputHandler,
}: OverlayWrapperProps) => {
  const [selectedSubviewId, setSelectedSubviewId] = useState<string | null>(
    overlaySubviews.length > 0 ? overlaySubviews[0].id : null
  );
  const [loadedData, setLoadedData] = useState<Map<string, SankeyData | SunburstData>>(new Map());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (!inputHandler) return;
    void inputHandler.enqueue(actions.changeViewMode('diagram'));
  };

  // Load data for selected visualization
  useEffect(() => {
    if (!selectedSubviewId) return;

    const subview = overlaySubviews.find(sv => sv.id === selectedSubviewId);
    if (!subview) return;

    // Check if data already loaded
    if (loadedData.has(selectedSubviewId)) return;

    // Load the data
    const loadData = async () => {
      setIsLoading(true);
      try {
        let dataPath: string;
        if (subview.type === 'sankey' && subview.sankeyData) {
          dataPath = subview.sankeyData.path.endsWith('.json')
            ? subview.sankeyData.path
            : `${subview.sankeyData.path}.json`;
        } else if (subview.type === 'sunburst' && subview.sunburstData) {
          dataPath = subview.sunburstData.path.endsWith('.json')
            ? subview.sunburstData.path
            : `${subview.sunburstData.path}.json`;
        } else {
          return;
        }

        const response = await fetch(dataPath);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        setLoadedData(prev => new Map(prev).set(selectedSubviewId, data));
      } catch (error) {
        console.error('Failed to load visualization data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [selectedSubviewId, overlaySubviews, loadedData]);

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

  const selectedSubview = selectedSubviewId ? overlaySubviews.find(sv => sv.id === selectedSubviewId) : null;
  const selectedData = selectedSubviewId ? loadedData.get(selectedSubviewId) : null;

  if (!selectedSubview) {
    return null;
  }

  // Calculate overlay dimensions (95% of viewport)
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const overlayWidth = viewportWidth * 0.95;
  const overlayHeight = viewportHeight * 0.95;

  // Handle backdrop click to close
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      {/* Main panel */}
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
          <div className="flex-1">
            {/* Dropdown selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-gray-700 transition"
              >
                <span>{selectedSubview.label}</span>
                {overlaySubviews.length > 1 && (
                  <svg
                    className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {isDropdownOpen && overlaySubviews.length > 1 && (
                <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg z-10">
                  <div className="py-2 max-h-96 overflow-y-auto">
                    {overlaySubviews.map((subview) => (
                      <button
                        key={subview.id}
                        type="button"
                        onClick={() => {
                          setSelectedSubviewId(subview.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition ${
                          selectedSubviewId === subview.id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {subview.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedData && 'meta' in selectedData && selectedData.meta?.source && (
              <p className="text-sm text-gray-600 mt-1">
                Data: {selectedData.meta.source}
              </p>
            )}
            {selectedSubview.type === 'sunburst' && (
              <p className="text-xs text-gray-500 mt-1">
                Click on a segment to zoom in. Click the center or same segment to zoom out.
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
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

        {/* Render selected visualization */}
        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-600 text-xl">Loading visualization...</div>
            </div>
          )}

          {!isLoading && selectedSubview.type === 'sunburst' && selectedData && (
            <SunburstOverlay
              data={selectedData as SunburstData}
              width={overlayWidth}
              height={overlayHeight - 100}
            />
          )}

          {!isLoading && selectedSubview.type === 'sankey' && selectedData && (
            <SankeyOverlay
              data={selectedData as SankeyData}
              width={overlayWidth}
              height={overlayHeight - 100}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export { OverlayWrapper };
