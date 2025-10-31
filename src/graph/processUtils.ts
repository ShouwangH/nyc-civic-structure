import type { GraphEdgeInfo, GraphNodeInfo } from './types';
import type { ProcessDefinition } from '../data/types';
import { NODE_HEIGHT, NODE_WIDTH } from './constants';

const DEFAULT_PROCESS_COLOR = '#2563eb';

const toTitleCase = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const createPlaceholderProcessNode = (id: string): GraphNodeInfo => ({
  id,
  label: toTitleCase(id),
  branch: 'process',
  type: 'process',
  process: [],
  factoid: 'Process participant highlighted for this view.',
  branchColor: DEFAULT_PROCESS_COLOR,
  system: 'process',
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
});

export const createProcessEdgeInfo = (
  processId: string,
  edge: ProcessDefinition['edges'][number],
): GraphEdgeInfo => ({
  id: `${edge.source}->${edge.target}`,
  source: edge.source,
  target: edge.target,
  label: '',
  type: 'relationship',
  process: [processId],
});
