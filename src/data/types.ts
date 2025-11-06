export type StructureNode = {
  id: string;
  label: string;
  type: string;
  branch: string;
  factoid: string;
  process?: string[];
  position?: { x: number; y: number };
  parent?: string;
  tier?: 'main' | 'intra' | 'detailed';
};

export type StructureData = {
  meta: {
    title: string;
    description: string;
  };
  nodes: StructureNode[];
};

export type RawEdge = {
  source: string;
  target: string;
  id?: string;
  label?: string;
  type?: string;
  process?: string[];
};

export type EdgesData = {
  edges: RawEdge[];
};

export type ScopeData = {
  meta: {
    title: string;
    description: string;
  };
  nodes: StructureNode[];
  edges: RawEdge[];
};

export type ProcessStep = {
  id: string;
  title: string;
  description: string;
};

export type GovernmentScope = 'city' | 'state' | 'federal';

// Edge relationship taxonomy and visual encoding
export type EdgeCategory =
  | 'hierarchical'    // establishes, oversees, contains
  | 'appointment'     // appoints, nominates, confirms
  | 'legislative'     // proposes, enacts, vetoes, signs
  | 'financial'       // funds, allocates, audits, appropriates
  | 'review'          // reviews, approves, advises
  | 'judicial'        // interprets, reviews, challenges
  | 'electoral';      // elects, represents

export type EdgeRelation =
  // Hierarchical
  | 'establishes'
  | 'oversees'
  | 'contains'
  | 'includes'
  | 'derives_from'
  | 'reports_to'

  // Appointment
  | 'appoints'
  | 'nominates'
  | 'confirms'
  | 'appoints_board'
  | 'appoints_commissioners'
  | 'appoints_members'

  // Legislative
  | 'enacts'
  | 'proposes'
  | 'vetoes'
  | 'signs'
  | 'can_override'
  | 'adopts'

  // Financial
  | 'funds'
  | 'allocates'
  | 'appropriates'
  | 'audits'
  | 'registers'
  | 'manages'

  // Review
  | 'reviews'
  | 'approves'
  | 'advises'
  | 'recommends'

  // Electoral
  | 'elects'
  | 'represents'

  // Judicial
  | 'interprets'
  | 'challenges'
  | 'reviews_from'

  // Flow (processes)
  | 'submits_to'
  | 'forwards_to'
  | 'sends_to'
  | 'flows_to'

  // Fallback
  | 'relates_to';

export const EDGE_CATEGORY_COLORS: Record<EdgeCategory, string> = {
  hierarchical: '#1e40af',    // Blue
  appointment: '#7c3aed',     // Purple
  legislative: '#059669',     // Green
  financial: '#d97706',       // Orange
  review: '#6b7280',          // Gray
  judicial: '#dc2626',        // Red
  electoral: '#0891b2',       // Cyan
};

// Unified subview system types
export type SubviewType =
  | 'inter'                  // Inter-entity relationships (default main view)
  | 'intra'                  // Intra-entity (internal structure)
  | 'cross-jurisdictional'   // Cross-level relationships
  | 'workflow'               // Process flows
  | 'sankey';                // Sankey diagram (financial flows, etc.)

export type SubviewLayoutConfig = {
  type: 'elk-mrtree' | 'elk-layered' | 'concentric';
  options?: {
    direction?: 'DOWN' | 'UP' | 'RIGHT' | 'LEFT';
    spacing?: number;
    centerOn?: string;  // Node ID to center on
    levels?: Record<string, number>;  // For concentric: explicit level per node
    [key: string]: unknown;
  };
  fit?: boolean;
  padding?: number;
  animate?: boolean;
};

// NOTE: For concentric layouts:
// - If `options.levels` is provided, use explicit level mapping
// - Otherwise, fallback heuristic: anchor node = 3, offices = 2, others = 1
// - Higher numbers = closer to center

export type SankeyReference = {
  type: 'file';
  path: string;  // e.g., 'data/nyc_pension_sankey.json'
};

export type SubviewDefinition = {
  // Identity
  id: string;
  label: string;
  description?: string;

  // Classification
  type: SubviewType;
  jurisdiction: GovernmentScope | 'multi';

  // Render target: where this subview is displayed
  // 'cytoscape': manipulates the cytoscape graph (adds/removes nodes, styles)
  // 'overlay': renders in separate overlay layer (e.g., Sankey, timeline, etc.)
  renderTarget?: 'cytoscape' | 'overlay';  // Defaults to 'cytoscape'

  // Anchor nodes (what triggers this view)
  anchor?: {
    nodeId?: string;        // Single anchor node
    nodeIds?: string[];     // Multiple anchor nodes (for workflows)
  };

  // Content (REFERENCES ONLY - no ephemeral nodes)
  // For cytoscape renderTarget: Node IDs that must exist in main graph
  // For overlay renderTarget: May be empty
  nodes: string[];
  edges: Array<{
    source: string;
    target: string;
    relation?: EdgeRelation;
    detail?: string;
    label?: string;
  }>;

  // For overlay renderTarget with external data (e.g., Sankey)
  sankeyData?: SankeyReference;

  // Presentation (FIXED per subview)
  layout: SubviewLayoutConfig;

  // Metadata
  metadata?: {
    steps?: ProcessStep[];           // For workflows
    tags?: string[];
    importance?: 'critical' | 'high' | 'medium' | 'low';
    [key: string]: unknown;
  };
};

export type SubviewsFile = {
  meta: {
    jurisdiction: GovernmentScope | 'cross-jurisdictional';
    version: string;
    description?: string;
  };
  subviews: SubviewDefinition[];
};
