import type { GovernmentScope } from '../data/datasets';
import type { SubviewDefinition } from '../data/types';
import type { GraphNodeInfo, GraphEdgeInfo } from '../visualization/cytoscape/types';
import type { InputHandler } from '../visualization/cytoscape/inputHandler';
import { actions } from '../visualization/cytoscape/actions';
import { Details } from './Details';

type ScopeOption = {
  id: GovernmentScope;
  label: string;
};

type ControlsPanelProps = {
  scopes: ScopeOption[];
  activeScope: GovernmentScope | null;
  workflows: SubviewDefinition[];
  activeSubviewId: string | null;
  inputHandler: InputHandler | null;
  // Props for Details tab
  activeNode: GraphNodeInfo | null;
  activeEdge: GraphEdgeInfo | null;
  edgeSourceNode: GraphNodeInfo | null;
  edgeTargetNode: GraphNodeInfo | null;
  activeProcess: SubviewDefinition | null;
  isSubviewActive: boolean;
  activeTab: 'details' | 'processes';
};

const getButtonClasses = (isActive: boolean, size: 'default' | 'small' = 'default'): string => {
  const baseClasses = 'w-full rounded-xl px-3 py-2 text-left transition border';
  const sizeClasses = size === 'small' ? 'text-lg' : 'text-xl';
  const stateClasses = isActive
    ? 'bg-blue-600 text-white border-blue-600 shadow-xl'
    : 'bg-white text-slate-700 hover:bg-slate-200 border-slate-200';

  return `${baseClasses} ${sizeClasses} ${stateClasses}`;
};

const ControlsPanel = ({
  scopes,
  activeScope,
  workflows,
  activeSubviewId,
  inputHandler,
  activeNode,
  activeEdge,
  edgeSourceNode,
  edgeTargetNode,
  activeProcess,
  isSubviewActive,
  activeTab,
}: ControlsPanelProps) => {

  // Group workflows by jurisdiction
  const groupedWorkflows = workflows.reduce((acc, workflow) => {
    const jurisdiction = workflow.jurisdiction || 'other';
    if (!acc[jurisdiction]) {
      acc[jurisdiction] = [];
    }
    acc[jurisdiction].push(workflow);
    return acc;
  }, {} as Record<string, SubviewDefinition[]>);

  const jurisdictionLabels: Record<string, string> = {
    federal: 'Federal',
    state: 'State',
    city: 'City',
  };

  return (
    <aside
      className="relative flex flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50 shadow-sm"
      aria-label="Controls menu"
    >
      {/* Scope Toggle - Above Tabs */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex rounded-xl bg-slate-200 border border-slate-300 p-1 shadow-inner">
          {scopes.map((scope) => (
            <button
              key={scope.id}
              type="button"
              onClick={() => {
                if (!inputHandler) return;
                void inputHandler.enqueue(actions.changeScope(scope.id));
              }}
              className={`flex-1 rounded-xl px-3 py-2 text-base font-medium transition-all ${
                activeScope === scope.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {scope.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            if (!inputHandler) return;
            void inputHandler.enqueue(actions.changeControlPanelTab('details'));
          }}
          className={`flex-1 px-4 py-3 text-base font-medium transition ${
            activeTab === 'details'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => {
            if (!inputHandler) return;
            void inputHandler.enqueue(actions.changeControlPanelTab('processes'));
          }}
          className={`flex-1 px-4 py-3 text-base font-medium transition ${
            activeTab === 'processes'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Processes
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5">
        {activeTab === 'details' ? (
          <Details
            activeNode={activeNode}
            activeEdge={activeEdge}
            edgeSourceNode={edgeSourceNode}
            edgeTargetNode={edgeTargetNode}
            activeProcess={activeProcess}
            isSubviewActive={isSubviewActive}
          />
        ) : (
          <div className="flex flex-col gap-6 text-xl text-slate-700">
            {Object.entries(groupedWorkflows).map(([jurisdiction, workflowList]) => (
              <div key={jurisdiction} className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {jurisdictionLabels[jurisdiction] || jurisdiction}
                </h3>
                {workflowList.map((workflow) => {
                  const isActive = activeSubviewId === workflow.id;
                  return (
                    <button
                      key={workflow.id}
                      type="button"
                      onClick={() => {
                        if (!inputHandler) return;
                        if (isActive) {
                          void inputHandler.enqueue(actions.deactivateSubview());
                        } else {
                          void inputHandler.enqueue(actions.activateSubview(workflow.id));
                        }
                      }}
                      className={getButtonClasses(isActive)}
                    >
                      {workflow.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export { ControlsPanel };
