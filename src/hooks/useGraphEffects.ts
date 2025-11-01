// ABOUTME: Reactive effect layer for graph operations
// ABOUTME: Single coordinating effect that syncs graph state with React state

import { useEffect, useRef } from 'react';
import type { GraphCanvasHandle } from '../components/GraphCanvas';
import type { VisualizationState } from '../state/useVisualizationState';
import { GRAPH_DATA } from '../data/graphDataPipeline';

/**
 * Reactive effect layer that synchronizes graph operations with state changes
 *
 * Architecture:
 * - Single coordinating effect (prevents race conditions)
 * - Detects ALL state changes in one place
 * - Executes graph operations in serial order
 * - State changes are the source of truth
 * - Graph operations are side effects
 *
 * Why a single effect instead of multiple?
 * - Multiple effects can fire in parallel and race
 * - Serial execution ensures predictable order
 * - Easier to reason about transition logic
 */
export const useGraphEffects = (
  state: VisualizationState,
  graphRef: React.RefObject<GraphCanvasHandle | null>,
  options: {
    enabled: boolean; // Feature flag to enable/disable effect layer
  } = { enabled: true }
) => {
  const prevState = useRef<VisualizationState>(state);
  const isInitialMount = useRef(true);
  const isAnimating = useRef(false);

  // Single coordinating effect - handles ALL graph operations
  useEffect(() => {
    if (!options.enabled) return;

    const graphHandle = graphRef.current;
    if (!graphHandle) return;

    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevState.current = state;
      return;
    }

    // Skip if animation in progress (prevents race conditions from rapid clicks)
    if (isAnimating.current) {
      return;
    }

    const prev = prevState.current;

    // Detect changes
    const scopeChanged = state.activeScope !== prev.activeScope;
    const processChanged = state.activeProcessId !== prev.activeProcessId;
    const subgraphChanged = state.activeSubgraphId !== prev.activeSubgraphId;

    // If nothing changed, bail early
    if (!scopeChanged && !processChanged && !subgraphChanged) {
      prevState.current = state;
      return;
    }

    // Execute graph operations in SERIAL order to prevent races
    const syncGraphToState = async () => {
      isAnimating.current = true;

      try {
        // 1. Handle scope changes (highest priority - clears everything)
        if (scopeChanged) {
          if (state.activeScope) {
            const nodeIds = GRAPH_DATA.scopeNodeIds[state.activeScope] ?? [];

            if (nodeIds.length > 0) {
              // Clear all previous graph state
              await graphHandle.clearProcessHighlight();
              await graphHandle.restoreMainView();
              graphHandle.clearNodeFocus();

              // Focus on new scope nodes
              await graphHandle.focusNodes(nodeIds);
            }
          } else {
            // Scope was cleared - clear all graph state
            await graphHandle.clearProcessHighlight();
            await graphHandle.restoreMainView();
            graphHandle.clearNodeFocus();
          }
        }

        // 2. Handle subgraph changes (medium priority)
        if (subgraphChanged && !scopeChanged) {
          if (state.activeSubgraphId) {
            // Activating or switching subgraph
            // If there was an active process, clear it first
            if (prev.activeProcessId) {
              await graphHandle.clearProcessHighlight();
            }
            // If switching between subgraphs, restore main view first
            if (prev.activeSubgraphId && prev.activeSubgraphId !== state.activeSubgraphId) {
              await graphHandle.restoreMainView();
            }
            await graphHandle.activateSubgraph(state.activeSubgraphId);
          } else if (!state.activeSubgraphId && prev.activeSubgraphId) {
            // Deactivating subgraph
            await graphHandle.restoreMainView();
          }
        }

        // 3. Handle process changes (lowest priority)
        if (processChanged && !scopeChanged) {
          if (state.activeProcessId) {
            // Activating or switching process
            // If there was an active subgraph, restore main view first
            if (prev.activeSubgraphId) {
              await graphHandle.restoreMainView();
            }
            // Always highlight the new process (handles both new and switch)
            await graphHandle.highlightProcess(state.activeProcessId);
          } else if (!state.activeProcessId && prev.activeProcessId) {
            // Deactivating process
            await graphHandle.clearProcessHighlight();
          }
        }

        // Update previous state AFTER all operations complete
        prevState.current = state;
      } finally {
        isAnimating.current = false;
      }
    };

    // Execute synchronization
    void syncGraphToState();
  }, [state, graphRef, options.enabled]);
};
