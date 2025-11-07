// ABOUTME: Wrapper component for displaying visualization overlays
// ABOUTME: Includes dropdown to select from all available Sankey and Sunburst visualizations

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
  controlPanelWidth: number;
};

const OverlayWrapper = ({
  overlaySubviews,
  inputHandler,
  controlPanelWidth,
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

  return (
    <div className="fixed inset-0 z-50 bg-[#eceae4]" style={{ paddingLeft: `${controlPanelWidth}px` }}>
      {/* Dropdown floating in top left */}
      <div className="absolute top-6 left-6 z-[60]" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-100 transition"
        >
          <span>{selectedSubview.label}</span>
          <svg
            className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDropdownOpen && overlaySubviews.length > 1 && (
          <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg">
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

      {/* Render selected visualization */}
      {isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-slate-600 text-xl">Loading visualization...</div>
        </div>
      )}

      {!isLoading && selectedSubview.type === 'sunburst' && selectedData && (
        <SunburstOverlay
          subview={selectedSubview}
          data={selectedData as SunburstData}
          onClose={handleClose}
          controlPanelWidth={controlPanelWidth}
        />
      )}

      {!isLoading && selectedSubview.type === 'sankey' && selectedData && (
        <SankeyOverlay
          subview={selectedSubview}
          data={selectedData as SankeyData}
          onClose={handleClose}
          controlPanelWidth={controlPanelWidth}
        />
      )}
    </div>
  );
};

export { OverlayWrapper };
