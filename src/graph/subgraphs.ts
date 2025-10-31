import type { GraphConfig } from './types';
import type { SubgraphFile } from '../data/types';

export type SubgraphConfig = {
  meta: SubgraphFile;
  graph: GraphConfig;
};
