// ABOUTME: TypeScript type definitions for Housing Timelapse feature
// ABOUTME: Defines interfaces for NYC Open Data responses and internal data structures

/**
 * NYC Open Data: Housing New York Units by Building
 * Source: https://data.cityofnewyork.us/Housing-Development/Housing-New-York-Units-by-Building/hg8x-zxpr
 */
export type HousingBuildingRecord = {
  project_id: string;
  project_name: string;
  building_id: string;
  house_number: string;
  street_name: string;
  borough: string;
  postcode: string;
  bbl: string;
  bin: string;
  community_board: string;
  council_district: string;
  census_tract: string;
  nta_neighborhood_tabulation_area: string;
  latitude: string;
  longitude: string;
  latitude_internal: string;
  longitude_internal: string;
  building_completion_date: string;
  reporting_construction_type: string;
  extended_affordability_only: string;
  prevailing_wage_status: string;
  extremely_low_income_units: string;
  very_low_income_units: string;
  low_income_units: string;
  moderate_income_units: string;
  middle_income_units: string;
  other_income_units: string;
  studio_units: string;
  '1_br_units': string;
  '2_br_units': string;
  '3_br_units': string;
  '4_br_units': string;
  '5_br_units': string;
  '6_br_units': string;
  unknown_br_units: string;
  counted_rental_units: string;
  counted_homeownership_units: string;
  all_counted_units: string;
  total_units: string;
};

/**
 * NYC Open Data: Zoning Districts
 * Source: https://data.cityofnewyork.us/City-Government/Department-of-City-Planning-Zoning-Features/7qct-p7rj
 */
export type ZoningFeature = {
  the_geom: {
    type: string;
    coordinates: number[][][];
  };
  zonedist: string;
  zoningcode: string;
  overlay1: string;
  overlay2: string;
  overlay3: string;
  overlay4: string;
  spdist1: string;
  spdist2: string;
  spdist3: string;
  ltdheight: string;
};

/**
 * Processed building data for visualization
 */
export type ProcessedBuilding = {
  id: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  borough: string;
  completionYear: number;
  totalUnits: number;
  affordableUnits: number;
  affordablePercentage: number;
  zoningDistrict?: string;
  address: string;
};

/**
 * Zoning district color mapping
 */
export type ZoningColorMap = Record<string, string>;

/**
 * Aggregated housing data by year
 */
export type HousingDataByYear = Map<number, ProcessedBuilding[]>;

/**
 * Cache metadata for NYC Open Data
 */
export type CacheMetadata = {
  timestamp: number;
  version: string;
  recordCount: number;
};

/**
 * Cached housing data
 */
export type CachedHousingData = {
  meta: CacheMetadata;
  buildings: HousingBuildingRecord[];
};

/**
 * Component props
 */
export type HousingTimelapseProps = {
  onClose: () => void;
};

export type Map3DProps = {
  buildings: ProcessedBuilding[];
  currentYear: number;
  zoningColors: ZoningColorMap;
  width: number;
  height: number;
};

export type TimeSliderProps = {
  currentYear: number;
  minYear: number;
  maxYear: number;
  isPlaying: boolean;
  playbackSpeed: number;
  onYearChange: (year: number) => void;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
};

export type LegendProps = {
  zoningColors: ZoningColorMap;
  currentYear: number;
  totalBuildings: number;
  totalUnits: number;
  affordableUnits: number;
};
