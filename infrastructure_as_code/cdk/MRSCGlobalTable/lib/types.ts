export interface RegionConfig {
  region: string;
  witness: boolean;
}

export interface GlobalTableConfig {
  tableName: string;
  regions: RegionConfig[];
}