import type { ProcessDefinition } from '../data/types';
import type { GraphEdgeInfo, GraphNodeInfo } from '../graph/types';

type DetailsSidebarProps = {
  activeNode: GraphNodeInfo | null;
  activeEdge: GraphEdgeInfo | null;
  edgeSourceNode: GraphNodeInfo | null;
  edgeTargetNode: GraphNodeInfo | null;
  activeProcess: ProcessDefinition | null;
  subgraphLabel: string | null;
  hasSelection: boolean;
  isSubgraphActive: boolean;
  onClear: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

const DetailsSidebar = ({
  activeNode,
  activeEdge,
  edgeSourceNode,
  edgeTargetNode,
  activeProcess,
  subgraphLabel,
  hasSelection,
  isSubgraphActive,
  onClear,
  onMouseEnter,
  onMouseLeave,
}: DetailsSidebarProps) => {
  const title = (() => {
    if (activeNode) {
      return activeNode.label;
    }
    if (activeEdge) {
      const sourceLabel = edgeSourceNode?.label ?? activeEdge.source;
      const targetLabel = edgeTargetNode?.label ?? activeEdge.target;
      return `${sourceLabel} → ${targetLabel}`;
    }
    if (activeProcess) {
      return `${activeProcess.label} process`;
    }
    if (isSubgraphActive) {
      return subgraphLabel ?? 'Details';
    }
    return 'Details';
  })();

  return (
    <aside
      className="pointer-events-auto z-30 hidden h-full flex-col overflow-y-auto border-l border-slate-200 bg-white px-6 py-6 text-sm text-slate-600 shadow-xl lg:flex lg:w-[320px]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start justify-between">
        <h2 className="text-2xl font-medium text-slate-900 hover:cursor-grab">{title}</h2>
        {hasSelection && (
          <button
            type="button"
            onClick={onClear}
            className="text-2xl font-medium text-slate-500 transition hover:text-slate-700"
          >
            X
          </button>
        )}
      </div>

      <div className="mt-4 space-y-4 text-xl text-slate-600">
        {activeNode ? (
          <>
            <p>{activeNode.factoid}</p>
          </>
        ) : activeEdge ? (
          <dl className="space-y-2">
            <div>
              <dt className="text-slate-500">From</dt>
              <dd className="font-semibold text-slate-900">{edgeSourceNode?.label ?? activeEdge.source}</dd>
            </div>
            <div>
              <dt className="text-slate-500">To</dt>
              <dd className="font-semibold text-slate-900">{edgeTargetNode?.label ?? activeEdge.target}</dd>
            </div>
            {activeEdge.label && (
              <div>
                <dt className="text-slate-500">Relationship</dt>
                <dd className="text-slate-700">{activeEdge.label}</dd>
              </div>
            )}
          </dl>
        ) : activeProcess ? (
          <div className="space-y-3">
            <p>{activeProcess.description}</p>
            {activeProcess.steps && (
              <ul className="space-y-2 text-xs text-slate-500">
                {activeProcess.steps.map((step) => (
                  <li key={step.id}>
                    <span className="font-semibold text-slate-700">{step.title}:</span>{' '}
                    {step.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : isSubgraphActive ? (
          <p className="text-slate-500">
            Use the left menu or click the highlighted hub node to collapse this focused subgraph
            and return to the full structure.
          </p>
        ) : (
          <p className="text-slate-500">
            Select a civic entity, relationship, or process to see focused details.
          </p>
        )}
      </div>
    </aside>
  );
};

export { DetailsSidebar };
