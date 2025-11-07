import type { GovernmentScope } from '../data/datasets';
import type { SubviewDefinition } from '../data/types';
import type { InputHandler } from '../visualization/cytoscape/inputHandler';
import { actions } from '../visualization/cytoscape/actions';

type ScopeOption = {
  id: GovernmentScope;
  label: string;
};

type ControlsPanelProps = {
  scopes: ScopeOption[];
  activeScope: GovernmentScope | null;
  subviews: SubviewDefinition[];
  activeSubviewId: string | null;
  inputHandler: InputHandler | null;
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
  subviews,
  activeSubviewId,
  inputHandler,
}: ControlsPanelProps) => {
  return (
    <aside
      className="relative flex flex-1 flex-col rounded-lg border border-slate-200 bg-slate-50 shadow-sm"
      aria-label="Controls menu"
    >
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5 text-xl text-slate-700">
          <section className="space-y-3">
            <div className="flex rounded-lg bg-white border border-slate-200 p-1">
              {scopes.map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => {
                    if (!inputHandler) return;
                    void inputHandler.enqueue(actions.changeScope(scope.id));
                  }}
                  className={`flex-1 rounded-md px-3 py-2 text-base font-medium transition ${
                    activeScope === scope.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </section>

          {subviews.filter(sv => sv.renderTarget === 'overlay').length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold uppercase tracking-wide text-slate-500">
                Views
              </h2>
              <div className="space-y-2">
                {subviews.filter(sv => sv.renderTarget === 'overlay').map((subview) => {
                  const isActive = activeSubviewId === subview.id;
                  return (
                    <button
                      key={subview.id}
                      type="button"
                      onClick={() => {
                        if (!inputHandler) return;

                        if (isActive) {
                          void inputHandler.enqueue(actions.backgroundClick());
                        } else {
                          void inputHandler.enqueue(actions.activateSubview(subview.id));
                        }
                      }}
                      className={getButtonClasses(isActive)}
                    >
                      {subview.label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
    </aside>
  );
};

export { ControlsPanel };
