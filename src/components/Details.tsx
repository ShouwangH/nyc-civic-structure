// ABOUTME: Simple details display component for rendering selected entity information
// ABOUTME: Receives props and renders content without managing state or logic

import type { SubviewDefinition, ProcessStep } from '../data/types';
import type { GraphEdgeInfo, GraphNodeInfo } from '../visualization/cytoscape/types';

type DetailsProps = {
  activeNode: GraphNodeInfo | null;
  activeEdge: GraphEdgeInfo | null;
  edgeSourceNode: GraphNodeInfo | null;
  edgeTargetNode: GraphNodeInfo | null;
  activeProcess: SubviewDefinition | null;
  isSubviewActive: boolean;
};

const Details = ({
  activeNode,
  activeEdge,
  edgeSourceNode,
  edgeTargetNode,
  activeProcess,
  isSubviewActive,
}: DetailsProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-4 text-xl text-slate-600">
        {activeNode ? (
          <p>{activeNode.factoid}</p>
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
            {activeProcess.metadata?.steps && Array.isArray(activeProcess.metadata.steps) && (
              <ul className="space-y-2 text-x text-slate-500">
                {(activeProcess.metadata.steps as ProcessStep[]).map((step) => (
                  <li key={step.id}>
                    <span className="font-semibold text-slate-700">{step.title}:</span>{' '}
                    {step.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : isSubviewActive ? (
          <p className="text-slate-500">
            Use the left menu or click outside the hub to collapse this focused subview
            and return to the full structure.
          </p>
        ) : (
          <p className="text-slate-500">
            Select a civic entity, relationship, or process to see focused details.
          </p>
        )}
      </div>
    </div>
  );
};

export { Details };
