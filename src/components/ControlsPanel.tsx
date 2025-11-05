import type { GovernmentScope } from '../data/datasets';
import type { ProcessDefinition } from '../data/types';
import type { SubgraphConfig } from '../graph/subgraphs';
import type { GraphCanvasHandle } from './GraphCanvas';

type ScopeOption = {
  id: GovernmentScope;
  label: string;
};

type ControlsPanelProps = {
  scopes: ScopeOption[];
  activeScope: GovernmentScope | null;
  onScopeChange: (scope: GovernmentScope) => void;
  subgraphConfigs: SubgraphConfig[];
  activeSubgraphId: string | null;
  processes: ProcessDefinition[];
  activeProcessId: string | null;
  isOpen: boolean;
  onToggleOpen: () => void;
  graphRef: React.RefObject<GraphCanvasHandle | null>;
};

const getButtonClasses = (isActive: boolean, size: 'default' | 'small' = 'default'): string => {
  const baseClasses = 'w-full rounded-md px-3 py-2 text-left transition border';
  const sizeClasses = size === 'small' ? 'text-lg' : 'text-xl';
  const stateClasses = isActive
    ? 'bg-blue-600 text-white border-blue-600 shadow-xl'
    : 'bg-white text-slate-700 hover:bg-slate-200 border-slate-200';

  return `${baseClasses} ${sizeClasses} ${stateClasses}`;
};

const ControlsPanel = ({
  scopes,
  activeScope,
  onScopeChange,
  subgraphConfigs,
  activeSubgraphId,
  processes,
  activeProcessId,
  isOpen,
  onToggleOpen,
  graphRef,
}: ControlsPanelProps) => {
  const activeProcess = activeProcessId
    ? processes.find((process) => process.id === activeProcessId) ?? null
    : null;

  return (
    <aside
      className={`relative flex flex-shrink-0 flex-col border-slate-200 bg-slate-50 transition-all duration-200 ${
        isOpen ? 'w-3/12' : 'w-16'
      }`}
      aria-label="Controls menu"
    >
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 text-xl font-medium text-slate-600 transition hover:bg-slate-100"
      >
        <span>{isOpen ? 'Hide' : '='}</span>
        <span>{isOpen ? '⟨' : ''}</span>
      </button>

      {isOpen ? (
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5 text-xl text-slate-700">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-500">Scope</h2>
            <div className="space-y-2">
              {scopes.map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => onScopeChange(scope.id)}
                  className={getButtonClasses(activeScope === scope.id)}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-500">
              Departments and Agencies
            </h2>
            {activeScope === null ? (
              <p className="text-lg text-slate-500">Select a scope to view agencies and departments</p>
            ) : subgraphConfigs.length === 0 ? (
              <p className="text-lg text-slate-500">No agencies available for this scope.</p>
            ) : (
              <div className="space-y-2">
                {subgraphConfigs.map((config) => {
                  const isActive = activeSubgraphId === config.meta.id;
                  return (
                    <button
                      key={config.meta.id}
                      type="button"
                      onClick={() => {
                        const handlers = graphRef.current?.getHandlers?.();
                        if (!handlers) return;

                        if (isActive) {
                          void handlers.deactivateAll();
                        } else {
                          void handlers.activateSubview(config.meta.id);
                        }
                      }}
                      className={getButtonClasses(isActive)}
                    >
                      {config.meta.label}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-500">
              Processes
            </h2>
            {activeScope === null ? (
              <p className="text-lg text-slate-500">Select a scope to view processes.</p>
            ) : processes.length === 0 ? (
              <p className="text-lg text-slate-500">No processes yet for this scope.</p>
            ) : (
              <div className="space-y-2">
                {processes.map((process) => {
                  const isActive = process.id === activeProcessId;
                  return (
                    <button
                      key={process.id}
                      type="button"
                      onClick={() => {
                        const handlers = graphRef.current?.getHandlers?.();
                        if (!handlers) {
                          return;
                        }

                        if (isActive) {
                          void handlers.deactivateAll();
                        } else {
                          void handlers.activateSubview(process.id);
                        }
                      }}
                      className={getButtonClasses(isActive, 'small')}
                    >
                      {process.label}
                    </button>
                  );
                })}
              </div>
            )}
            {activeProcess && (
              <div className="rounded-md bg-slate-100 px-3 py-2 text-lg text-slate-600">
                <p className="font-semibold text-slate-700">{activeProcess.label}</p>
                <p className="mt-1">{activeProcess.description}</p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-lg font-semibold uppercase tracking-wide text-slate-500">
          Menu
        </div>
      )}
    </aside>
  );
};

export { ControlsPanel };
