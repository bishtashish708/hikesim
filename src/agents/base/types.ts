/**
 * Base types for the trail data collection agent system
 */

export interface RawTrail {
  name: string;
  distanceMiles?: number;
  elevationGainFt?: number;
  latitude?: number;
  longitude?: number;
  coordinates?: [number, number][]; // [lat, lon] pairs
  difficulty?: string;
  trailType?: string;
  surface?: string;
  city?: string;
  parkName?: string;
  region?: string;
  stateCode?: string;
  countryCode?: string;
  sourceUrl?: string;
  description?: string;
  source: 'nps' | 'osm' | 'manual';
  rawData?: any; // Original API response
}

export interface ProfilePoint {
  distanceMiles: number;
  elevationFt: number;
}

export interface ValidatedTrail extends RawTrail {
  distanceMiles: number; // Required after validation
  elevationGainFt: number; // Required after validation
  profilePoints: ProfilePoint[];
  qualityScore: number; // 0-100
  validationErrors: string[];
  validationWarnings: string[];
}

export interface ValidationResult {
  totalTrails: number;
  validTrails: ValidatedTrail[];
  invalidTrails: RawTrail[];
  duplicates: RawTrail[];
  summary: {
    passed: number;
    failed: number;
    duplicates: number;
    averageQualityScore: number;
  };
}

export interface AgentConfig {
  openRouterApiKey: string;
  npsApiKey?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CollectionResult {
  parkName: string;
  parkCode: string;
  trailsFound: number;
  trails: RawTrail[];
  source: 'nps' | 'osm';
  timestamp: string;
  errors: string[];
}

export interface InsertResult {
  attempted: number;
  inserted: number;
  skipped: number;
  failed: number;
  errors: string[];
  insertedIds: string[];
}
