import { useCallback, useMemo, useRef, useState } from 'react';
import type { GovernmentScope } from '../data/datasets';
import type { ProcessDefinition } from '../data/types';
import type { SubgraphConfig } from '../graph/subgraphs';
import { GRAPH_DATA } from '../data/graphDataPipeline';

export type VisualizationState = {
  controlsOpen: boolean;
  activeScope: GovernmentScope | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  activeSubviewId: string | null;
  isSidebarHover: boolean;
};

export const useVisualizationState = () => {
  const [controlsOpen, setControlsOpen] = useState(true);
  const [activeScope, setActiveScope] = useState<GovernmentScope | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [activeSubviewId, setActiveSubviewId] = useState<string | null>(null);
  const [isSidebarHover, setIsSidebarHover] = useState(false);

  // Keep a ref to current state for imperative handlers
  const stateRef = useRef<VisualizationState>({
    controlsOpen,
    activeScope,
    selectedNodeId,
    selectedEdgeId,
    activeSubviewId,
    isSidebarHover,
  });

  // Update ref on every render
  stateRef.current = {
    controlsOpen,
    activeScope,
    selectedNodeId,
    selectedEdgeId,
    activeSubviewId,
    isSidebarHover,
  };

  // For imperative handlers - stable reference that doesn't cause graph recreation
  const setState = useCallback((updater: (prev: VisualizationState) => VisualizationState) => {
    const updates = updater(stateRef.current);

    if (updates.controlsOpen !== stateRef.current.controlsOpen) setControlsOpen(updates.controlsOpen);
    if (updates.activeScope !== stateRef.current.activeScope) setActiveScope(updates.activeScope);
    if (updates.selectedNodeId !== stateRef.current.selectedNodeId) setSelectedNodeId(updates.selectedNodeId);
    if (updates.selectedEdgeId !== stateRef.current.selectedEdgeId) setSelectedEdgeId(updates.selectedEdgeId);
    if (updates.activeSubviewId !== stateRef.current.activeSubviewId) setActiveSubviewId(updates.activeSubviewId);
    if (updates.isSidebarHover !== stateRef.current.isSidebarHover) setIsSidebarHover(updates.isSidebarHover);
  }, []);

  // Action wrappers for common operations
  const actions = {
    toggleControlsOpen: () => setControlsOpen(prev => !prev),
    setSidebarHover: setIsSidebarHover,
    clearSelections: () => {
      setActiveScope(null);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setActiveSubviewId(null);
      setIsSidebarHover(false);
    },
  };

  // Build state object for consumers
  const state: VisualizationState = {
    controlsOpen,
    activeScope,
    selectedNodeId,
    selectedEdgeId,
    activeSubviewId,
    isSidebarHover,
  };

  // Derived selectors - computed based on current state
  const derived = useMemo(() => {
    const { nodesById, edgesById } = GRAPH_DATA.indexes;
    const { subgraphById } = GRAPH_DATA.maps;
    const { allProcesses } = GRAPH_DATA;

    // Filter by scope
    const visibleProcesses = activeScope
      ? (GRAPH_DATA.processesByScope[activeScope] ?? [])
      : ([] as ProcessDefinition[]);

    // Show all non-workflow subviews for the current scope
    const visibleSubgraphConfigs: SubgraphConfig[] = activeScope
      ? Array.from(GRAPH_DATA.maps.subgraphById.values()).filter(config => {
          const scope = GRAPH_DATA.indexes.subgraphScopeById.get(config.meta.id);
          return scope === activeScope;
        })
      : [];

    // Entity lookups
    const activeNode = selectedNodeId
      ? nodesById.get(selectedNodeId) ?? null
      : null;

    const activeEdge = selectedEdgeId
      ? edgesById.get(selectedEdgeId) ?? null
      : null;

    const activeProcess = activeSubviewId
      ? allProcesses.find((p) => p.id === activeSubviewId) ?? null
      : null;

    const selectedEdgeSource = activeEdge
      ? nodesById.get(activeEdge.source) ?? null
      : null;

    const selectedEdgeTarget = activeEdge
      ? nodesById.get(activeEdge.target) ?? null
      : null;

    const subgraphLabel = activeSubviewId
      ? (subgraphById.get(activeSubviewId)?.meta.label ??
         GRAPH_DATA.maps.subviewById.get(activeSubviewId)?.label ??
         null)
      : null;

    // Computed flags
    const selectionActive = Boolean(
      selectedNodeId ||
      selectedEdgeId ||
      activeSubviewId
    );

    const shouldShowSidebar = selectionActive || isSidebarHover;

    return {
      // Filtered lists
      visibleProcesses,
      visibleSubgraphConfigs,

      // Entity lookups
      activeNode,
      activeEdge,
      activeProcess,
      selectedEdgeSource,
      selectedEdgeTarget,
      subgraphLabel,

      // Computed flags
      selectionActive,
      shouldShowSidebar,
    };
  }, [
    activeScope,
    selectedNodeId,
    selectedEdgeId,
    activeSubviewId,
    isSidebarHover,
  ]);

  return {
    state,
    actions,
    derived,
    setState,
  };
};
