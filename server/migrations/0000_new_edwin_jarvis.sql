CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"record_id" text NOT NULL,
	"action" text NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capital_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"maprojid" text NOT NULL,
	"description" text NOT NULL,
	"managing_agency" text NOT NULL,
	"managing_agency_acronym" text,
	"type_category" text,
	"min_date" text,
	"max_date" text,
	"fiscal_year" integer,
	"completion_year" integer,
	"allocate_total" real DEFAULT 0 NOT NULL,
	"commit_total" real DEFAULT 0 NOT NULL,
	"spent_total" real DEFAULT 0 NOT NULL,
	"planned_commit_total" real DEFAULT 0 NOT NULL,
	"geometry" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "capital_projects_maprojid_unique" UNIQUE("maprojid")
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" text PRIMARY KEY NOT NULL,
	"scope_id" text NOT NULL,
	"source_id" text NOT NULL,
	"target_id" text NOT NULL,
	"label" text,
	"type" text,
	"relation" text,
	"detail" text,
	"process_tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "housing_buildings" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"longitude" real NOT NULL,
	"latitude" real NOT NULL,
	"address" text NOT NULL,
	"borough" text NOT NULL,
	"bbl" text,
	"bin" text,
	"postcode" text,
	"community_board" text,
	"council_district" text,
	"census_tract" text,
	"nta" text,
	"completion_year" integer NOT NULL,
	"completion_month" integer,
	"completion_date" text,
	"total_units" integer NOT NULL,
	"affordable_units" integer DEFAULT 0 NOT NULL,
	"affordable_percentage" real DEFAULT 0 NOT NULL,
	"extreme_low_income_units" integer DEFAULT 0,
	"very_low_income_units" integer DEFAULT 0,
	"low_income_units" integer DEFAULT 0,
	"moderate_income_units" integer DEFAULT 0,
	"middle_income_units" integer DEFAULT 0,
	"other_income_units" integer DEFAULT 0,
	"studio_units" integer DEFAULT 0,
	"one_br_units" integer DEFAULT 0,
	"two_br_units" integer DEFAULT 0,
	"three_br_units" integer DEFAULT 0,
	"four_br_units" integer DEFAULT 0,
	"five_br_units" integer DEFAULT 0,
	"six_br_units" integer DEFAULT 0,
	"unknown_br_units" integer DEFAULT 0,
	"building_type" text NOT NULL,
	"physical_building_type" text,
	"building_class" text,
	"zoning_district" text,
	"data_source" text NOT NULL,
	"is_renovation" boolean DEFAULT false,
	"project_id" text,
	"project_name" text,
	"construction_type" text,
	"extended_affordability_only" boolean DEFAULT false,
	"prevailing_wage_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "housing_demolitions" (
	"id" text PRIMARY KEY NOT NULL,
	"bbl" text,
	"borough" text NOT NULL,
	"address" text NOT NULL,
	"latitude" real,
	"longitude" real,
	"demolition_year" integer NOT NULL,
	"demolition_month" integer,
	"demolition_date" text,
	"estimated_units" integer DEFAULT 0 NOT NULL,
	"building_class" text,
	"job_number" text,
	"job_type" text DEFAULT 'DM',
	"job_status" text,
	"has_new_construction" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"scope_id" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"branch" text NOT NULL,
	"factoid" text NOT NULL,
	"position_x" real,
	"position_y" real,
	"parent_id" text,
	"process_tags" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "overlays" (
	"id" text PRIMARY KEY NOT NULL,
	"scope_id" text NOT NULL,
	"anchor_node_id" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"render_target" text,
	"data_source" text,
	"data_snapshot" jsonb,
	"metadata" jsonb,
	"last_fetched" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processes" (
	"id" text PRIMARY KEY NOT NULL,
	"scope_id" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"node_ids" text[] NOT NULL,
	"edge_data" jsonb NOT NULL,
	"steps" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sankey_datasets" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"fiscal_year" integer NOT NULL,
	"data_type" text NOT NULL,
	"units" text,
	"nodes" jsonb NOT NULL,
	"links" jsonb NOT NULL,
	"metadata" jsonb,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scopes" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subgraphs" (
	"id" text PRIMARY KEY NOT NULL,
	"scope_id" text NOT NULL,
	"label" text NOT NULL,
	"entry_node_id" text NOT NULL,
	"description" text,
	"layout_type" text,
	"elements" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sunburst_datasets" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"fiscal_year" integer NOT NULL,
	"data_type" text NOT NULL,
	"units" text,
	"total_value" real,
	"hierarchy_data" jsonb NOT NULL,
	"metadata" jsonb,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_id_nodes_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_id_nodes_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overlays" ADD CONSTRAINT "overlays_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overlays" ADD CONSTRAINT "overlays_anchor_node_id_nodes_id_fk" FOREIGN KEY ("anchor_node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subgraphs" ADD CONSTRAINT "subgraphs_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subgraphs" ADD CONSTRAINT "subgraphs_entry_node_id_nodes_id_fk" FOREIGN KEY ("entry_node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "capital_fiscal_year_idx" ON "capital_projects" USING btree ("fiscal_year");--> statement-breakpoint
CREATE INDEX "capital_managing_agency_idx" ON "capital_projects" USING btree ("managing_agency");--> statement-breakpoint
CREATE INDEX "capital_type_category_idx" ON "capital_projects" USING btree ("type_category");--> statement-breakpoint
CREATE INDEX "capital_completion_year_idx" ON "capital_projects" USING btree ("completion_year");--> statement-breakpoint
CREATE INDEX "housing_completion_year_idx" ON "housing_buildings" USING btree ("completion_year");--> statement-breakpoint
CREATE INDEX "housing_borough_idx" ON "housing_buildings" USING btree ("borough");--> statement-breakpoint
CREATE INDEX "housing_bbl_idx" ON "housing_buildings" USING btree ("bbl");--> statement-breakpoint
CREATE INDEX "housing_data_source_idx" ON "housing_buildings" USING btree ("data_source");--> statement-breakpoint
CREATE INDEX "housing_building_type_idx" ON "housing_buildings" USING btree ("building_type");--> statement-breakpoint
CREATE INDEX "demolition_year_idx" ON "housing_demolitions" USING btree ("demolition_year");--> statement-breakpoint
CREATE INDEX "demolition_bbl_idx" ON "housing_demolitions" USING btree ("bbl");--> statement-breakpoint
CREATE INDEX "demolition_borough_idx" ON "housing_demolitions" USING btree ("borough");--> statement-breakpoint
CREATE INDEX "sankey_fiscal_year_idx" ON "sankey_datasets" USING btree ("fiscal_year");--> statement-breakpoint
CREATE INDEX "sankey_data_type_idx" ON "sankey_datasets" USING btree ("data_type");--> statement-breakpoint
CREATE INDEX "sunburst_fiscal_year_idx" ON "sunburst_datasets" USING btree ("fiscal_year");--> statement-breakpoint
CREATE INDEX "sunburst_data_type_idx" ON "sunburst_datasets" USING btree ("data_type");