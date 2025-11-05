// ABOUTME: Reactive effect layer for graph operations
// ABOUTME: Single coordinating effect that syncs graph state with React state

import { useEffect, useRef } from 'react';
import type { GraphCanvasHandle } from '../components/GraphCanvas';
import type { VisualizationState } from '../state/useVisualizationState';

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
    const subviewChanged = state.activeSubviewId !== prev.activeSubviewId;

    // If nothing changed, bail early
    if (!scopeChanged && !subviewChanged) {
      prevState.current = state;
      return;
    }

    // Execute graph operations in SERIAL order to prevent races
    const syncGraphToState = async () => {
      isAnimating.current = true;

      try {
        // Handle scope changes - clears everything and focuses on scope nodes
        // Note: Subview activation is now handled by imperative handlers in actionHandlers.ts
        if (scopeChanged) {
          const handlers = graphHandle.getHandlers?.();

          if (state.activeScope) {
            // Scope selected - handled by imperative handlers already
            // This effect is redundant now, but keeping for backward compatibility
          } else {
            // Scope was cleared - use handlers to deactivate all
            if (handlers) {
              await handlers.deactivateAll();
            } else {
              // Fallback: clear focus if handlers not available
              graphHandle.clearNodeFocus();
            }
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
