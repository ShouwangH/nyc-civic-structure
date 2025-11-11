// ABOUTME: Comprehensive database schema using Drizzle ORM for all NYC civic data
// ABOUTME: Includes civic structure, housing data, capital budget, and financial visualizations

import { pgTable, text, real, integer, timestamp, jsonb, serial, boolean, index } from 'drizzle-orm/pg-core';

// ============================================================================
// CIVIC STRUCTURE TABLES (existing)
// ============================================================================

// Scopes table (federal, state, regional, city)
export const scopes = pgTable('scopes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Nodes table (government entities)
export const nodes = pgTable('nodes', {
  id: text('id').primaryKey(),
  scopeId: text('scope_id').notNull().references(() => scopes.id),
  label: text('label').notNull(),
  type: text('type').notNull(),
  branch: text('branch').notNull(),
  factoid: text('factoid').notNull(),
  positionX: real('position_x'),
  positionY: real('position_y'),
  parentId: text('parent_id'),
  processTags: text('process_tags').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Edges table (relationships between entities)
export const edges = pgTable('edges', {
  id: text('id').primaryKey(),
  scopeId: text('scope_id').notNull().references(() => scopes.id),
  sourceId: text('source_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => nodes.id, { onDelete: 'cascade' }),
  label: text('label'),
  type: text('type'),
  relation: text('relation'),
  detail: text('detail'),
  processTags: text('process_tags').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Processes table (workflow definitions)
export const processes = pgTable('processes', {
  id: text('id').primaryKey(),
  scopeId: text('scope_id').notNull().references(() => scopes.id),
  label: text('label').notNull(),
  description: text('description').notNull(),
  nodeIds: text('node_ids').array().notNull(),
  edgeData: jsonb('edge_data').notNull(), // Array of {source, target} objects
  steps: jsonb('steps'), // Array of step objects
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Subgraphs table (detailed views of specific entities)
export const subgraphs = pgTable('subgraphs', {
  id: text('id').primaryKey(),
  scopeId: text('scope_id').notNull().references(() => scopes.id),
  label: text('label').notNull(),
  entryNodeId: text('entry_node_id').notNull().references(() => nodes.id),
  description: text('description'),
  layoutType: text('layout_type'),
  elements: jsonb('elements').notNull(), // Full Cytoscape elements object
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Overlays table (sankey and sunburst visualizations anchored to nodes)
export const overlays = pgTable('overlays', {
  id: text('id').primaryKey(),
  scopeId: text('scope_id').notNull().references(() => scopes.id),
  anchorNodeId: text('anchor_node_id').notNull().references(() => nodes.id),
  label: text('label').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'sankey' | 'sunburst'
  renderTarget: text('render_target'), // 'overlay' | 'tab' | 'inline'
  dataSource: text('data_source'), // URL or reference to external data
  dataSnapshot: jsonb('data_snapshot'), // Cached data structure
  metadata: jsonb('metadata'), // Additional config (colors, formatting, etc.)
  lastFetched: timestamp('last_fetched'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Audit log for tracking changes
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  action: text('action').notNull(), // 'INSERT', 'UPDATE', 'DELETE'
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// HOUSING DATA TABLES (new)
// ============================================================================

/**
 * Processed housing buildings with all transformations applied at seed time
 * This replaces the client-side processing in housingDataProcessor.ts
 */
export const housingBuildings = pgTable('housing_buildings', {
  id: text('id').primaryKey(), // building_id or generated UUID
  name: text('name').notNull(),

  // Location
  longitude: real('longitude').notNull(),
  latitude: real('latitude').notNull(),
  address: text('address').notNull(),
  borough: text('borough').notNull(),
  bbl: text('bbl'), // Borough-Block-Lot identifier (normalized)
  bin: text('bin'), // Building Identification Number
  postcode: text('postcode'),
  communityBoard: text('community_board'),
  councilDistrict: text('council_district'),
  censusTract: text('census_tract'),
  nta: text('nta'), // Neighborhood Tabulation Area

  // Completion dates
  completionYear: integer('completion_year').notNull(),
  completionMonth: integer('completion_month'), // 1-12
  completionDate: text('completion_date'), // Full ISO date string

  // Unit counts
  totalUnits: integer('total_units').notNull(),
  affordableUnits: integer('affordable_units').notNull().default(0),
  affordablePercentage: real('affordable_percentage').notNull().default(0),

  // Affordable unit breakdown
  extremeLowIncomeUnits: integer('extreme_low_income_units').default(0),
  veryLowIncomeUnits: integer('very_low_income_units').default(0),
  lowIncomeUnits: integer('low_income_units').default(0),
  moderateIncomeUnits: integer('moderate_income_units').default(0),
  middleIncomeUnits: integer('middle_income_units').default(0),
  otherIncomeUnits: integer('other_income_units').default(0),

  // Unit breakdown by bedrooms
  studioUnits: integer('studio_units').default(0),
  oneBrUnits: integer('one_br_units').default(0),
  twoBrUnits: integer('two_br_units').default(0),
  threeBrUnits: integer('three_br_units').default(0),
  fourBrUnits: integer('four_br_units').default(0),
  fiveBrUnits: integer('five_br_units').default(0),
  sixBrUnits: integer('six_br_units').default(0),
  unknownBrUnits: integer('unknown_br_units').default(0),

  // Classification
  buildingType: text('building_type').notNull(), // affordable | renovation | one-two-family | multifamily-walkup | multifamily-elevator | mixed-use | unknown
  physicalBuildingType: text('physical_building_type'), // Physical type if different from main type
  buildingClass: text('building_class'), // PLUTO building class code
  zoningDistrict: text('zoning_district'),

  // Source tracking
  dataSource: text('data_source').notNull(), // 'housing-ny' | 'pluto' | 'dob'
  isRenovation: boolean('is_renovation').default(false),

  // Housing NY specific
  projectId: text('project_id'),
  projectName: text('project_name'),
  constructionType: text('construction_type'), // 'New Construction' | 'Preservation'
  extendedAffordabilityOnly: boolean('extended_affordability_only').default(false),
  prevailingWageStatus: text('prevailing_wage_status'),

  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(), // When data was last fetched from NYC Open Data
}, (table) => ({
  // Indexes for common queries
  completionYearIdx: index('housing_completion_year_idx').on(table.completionYear),
  boroughIdx: index('housing_borough_idx').on(table.borough),
  bblIdx: index('housing_bbl_idx').on(table.bbl),
  dataSourceIdx: index('housing_data_source_idx').on(table.dataSource),
  buildingTypeIdx: index('housing_building_type_idx').on(table.buildingType),
}));

/**
 * Demolition records for calculating net new housing
 */
export const housingDemolitions = pgTable('housing_demolitions', {
  id: text('id').primaryKey(), // job_number or generated UUID

  // Location
  bbl: text('bbl'), // Normalized BBL for matching with new construction
  borough: text('borough').notNull(),
  address: text('address').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),

  // Demolition details
  demolitionYear: integer('demolition_year').notNull(),
  demolitionMonth: integer('demolition_month'),
  demolitionDate: text('demolition_date'),

  // Units demolished
  estimatedUnits: integer('estimated_units').notNull().default(0), // Estimated from building class
  buildingClass: text('building_class'),

  // Job details
  jobNumber: text('job_number'),
  jobType: text('job_type').default('DM'), // Usually 'DM' for demolition
  jobStatus: text('job_status'),

  // Matching
  hasNewConstruction: boolean('has_new_construction').default(false), // Whether BBL has new construction after demolition

  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
}, (table) => ({
  demolitionYearIdx: index('demolition_year_idx').on(table.demolitionYear),
  bblIdx: index('demolition_bbl_idx').on(table.bbl),
  boroughIdx: index('demolition_borough_idx').on(table.borough),
}));

// ============================================================================
// CAPITAL BUDGET TABLES (new)
// ============================================================================

/**
 * NYC Capital budget projects with GeoJSON support
 */
export const capitalProjects = pgTable('capital_projects', {
  id: text('id').primaryKey(), // maprojid from CPDB

  // Project identification
  maprojid: text('maprojid').notNull().unique(),
  description: text('description').notNull(),

  // Agency
  managingAgency: text('managing_agency').notNull(),
  managingAgencyAcronym: text('managing_agency_acronym'),

  // Project classification
  typeCategory: text('type_category'),

  // Fiscal timeline
  minDate: text('min_date'), // Project start date
  maxDate: text('max_date'), // Project completion date
  fiscalYear: integer('fiscal_year'),
  completionYear: integer('completion_year'),

  // Budget allocations (in dollars)
  allocateTotal: real('allocate_total').notNull().default(0),
  commitTotal: real('commit_total').notNull().default(0),
  spentTotal: real('spent_total').notNull().default(0),
  plannedCommitTotal: real('planned_commit_total').notNull().default(0),

  // Geospatial data (PostGIS GeoJSON)
  geometry: jsonb('geometry').notNull(), // GeoJSON geometry object

  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
}, (table) => ({
  fiscalYearIdx: index('capital_fiscal_year_idx').on(table.fiscalYear),
  managingAgencyIdx: index('capital_managing_agency_idx').on(table.managingAgency),
  typeCategoryIdx: index('capital_type_category_idx').on(table.typeCategory),
  completionYearIdx: index('capital_completion_year_idx').on(table.completionYear),
}));

// ============================================================================
// FINANCIAL VISUALIZATION TABLES (new)
// ============================================================================

/**
 * Sankey diagram datasets (budget flows, pension allocations)
 */
export const sankeyDatasets = pgTable('sankey_datasets', {
  id: text('id').primaryKey(), // e.g., 'budget-fy2025', 'pension-2025'

  // Metadata
  label: text('label').notNull(),
  description: text('description').notNull(),
  fiscalYear: integer('fiscal_year').notNull(),
  dataType: text('data_type').notNull(), // 'budget' | 'pension' | 'custom'
  units: text('units'), // e.g., 'USD (millions)'

  // Sankey structure (stored as JSON for d3-sankey compatibility)
  nodes: jsonb('nodes').notNull(), // Array of {id, label, level?, type?}
  links: jsonb('links').notNull(), // Array of {source, target, value}

  // Optional metadata
  metadata: jsonb('metadata'), // Colors, categories, etc.

  // Timestamps
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  fiscalYearIdx: index('sankey_fiscal_year_idx').on(table.fiscalYear),
  dataTypeIdx: index('sankey_data_type_idx').on(table.dataType),
}));

/**
 * Sunburst diagram datasets (revenue, expense breakdowns)
 */
export const sunburstDatasets = pgTable('sunburst_datasets', {
  id: text('id').primaryKey(), // e.g., 'revenue-fy2025', 'expense-fy2025'

  // Metadata
  label: text('label').notNull(),
  description: text('description').notNull(),
  fiscalYear: integer('fiscal_year').notNull(),
  dataType: text('data_type').notNull(), // 'revenue' | 'expense' | 'custom'
  units: text('units'), // e.g., 'USD (millions)'
  totalValue: real('total_value'), // Root node total

  // Sunburst structure (stored as JSON for d3-hierarchy compatibility)
  // Format: {name: string, value?: number, children?: [...]}
  hierarchyData: jsonb('hierarchy_data').notNull(),

  // Optional metadata
  metadata: jsonb('metadata'), // Colors, formatting, etc.

  // Timestamps
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  fiscalYearIdx: index('sunburst_fiscal_year_idx').on(table.fiscalYear),
  dataTypeIdx: index('sunburst_data_type_idx').on(table.dataType),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Civic structure types
export type Scope = typeof scopes.$inferSelect;
export type Node = typeof nodes.$inferSelect;
export type Edge = typeof edges.$inferSelect;
export type Process = typeof processes.$inferSelect;
export type Subgraph = typeof subgraphs.$inferSelect;
export type Overlay = typeof overlays.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;

export type InsertScope = typeof scopes.$inferInsert;
export type InsertNode = typeof nodes.$inferInsert;
export type InsertEdge = typeof edges.$inferInsert;
export type InsertProcess = typeof processes.$inferInsert;
export type InsertSubgraph = typeof subgraphs.$inferInsert;
export type InsertOverlay = typeof overlays.$inferInsert;
export type InsertAuditLog = typeof auditLog.$inferInsert;

// Housing data types
export type HousingBuilding = typeof housingBuildings.$inferSelect;
export type HousingDemolition = typeof housingDemolitions.$inferSelect;

export type InsertHousingBuilding = typeof housingBuildings.$inferInsert;
export type InsertHousingDemolition = typeof housingDemolitions.$inferInsert;

// Capital budget types
export type CapitalProject = typeof capitalProjects.$inferSelect;
export type InsertCapitalProject = typeof capitalProjects.$inferInsert;

// Financial visualization types
export type SankeyDataset = typeof sankeyDatasets.$inferSelect;
export type SunburstDataset = typeof sunburstDatasets.$inferSelect;

export type InsertSankeyDataset = typeof sankeyDatasets.$inferInsert;
export type InsertSunburstDataset = typeof sunburstDatasets.$inferInsert;
