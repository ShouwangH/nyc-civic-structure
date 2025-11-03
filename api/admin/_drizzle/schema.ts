// ABOUTME: Database schema definition using Drizzle ORM
// ABOUTME: Mirrors the JSON data structure for civic governance data

import { pgTable, text, real, timestamp, jsonb, serial } from 'drizzle-orm/pg-core';

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

// Type exports for use in API endpoints
export type Scope = typeof scopes.$inferSelect;
export type Node = typeof nodes.$inferSelect;
export type Edge = typeof edges.$inferSelect;
export type Process = typeof processes.$inferSelect;
export type Subgraph = typeof subgraphs.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;

export type InsertScope = typeof scopes.$inferInsert;
export type InsertNode = typeof nodes.$inferInsert;
export type InsertEdge = typeof edges.$inferInsert;
export type InsertProcess = typeof processes.$inferInsert;
export type InsertSubgraph = typeof subgraphs.$inferInsert;
export type InsertAuditLog = typeof auditLog.$inferInsert;
