// ABOUTME: Toggle component for switching between Diagram, Financials, and Maps modes
// ABOUTME: Displays as a centered toggle similar to scope selector

import type { InputHandler } from '../visualization/cytoscape/inputHandler';
import { actions } from '../visualization/cytoscape/actions';

type DiagramViewToggleProps = {
  mode: 'diagram' | 'financials' | 'maps';
  inputHandler: InputHandler | null;
};

const DiagramViewToggle = ({ mode, inputHandler }: DiagramViewToggleProps) => {
  return (
    <div className="flex justify-center">
      <div className="inline-flex rounded-xl bg-slate-200 border border-slate-300 p-1 shadow-inner">
        <button
          type="button"
          onClick={() => {
            if (!inputHandler) return;
            void inputHandler.enqueue(actions.changeViewMode('diagram'));
          }}
          className={`rounded-xl px-4 py-2 text-base font-medium transition-all ${
            mode === 'diagram'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Diagram
        </button>
        <button
          type="button"
          onClick={() => {
            if (!inputHandler) return;
            void inputHandler.enqueue(actions.changeViewMode('financials'));
          }}
          className={`rounded-xl px-4 py-2 text-base font-medium transition-all ${
            mode === 'financials'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Financials
        </button>
        <button
          type="button"
          onClick={() => {
            if (!inputHandler) return;
            void inputHandler.enqueue(actions.changeViewMode('maps'));
          }}
          className={`rounded-xl px-4 py-2 text-base font-medium transition-all ${
            mode === 'maps'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Maps
        </button>
      </div>
    </div>
  );
};

export { DiagramViewToggle };
