/**
 * Shared types for Multi-Agent Trail Collection System
 */

export interface Coordinate {
  lat: number;
  lon: number;
  elevation?: number;
}

export interface RawTrailData {
  source: 'nps' | 'google' | 'scrape' | 'opentopo';
  confidence: number; // 0-100
  name: string;
  parkName: string;
  parkCode?: string;
  stateCode?: string;
  coordinates?: Coordinate[];
  distanceMiles?: number;
  elevationGainFt?: number;
  difficulty?: string;
  trailType?: string;
  description?: string;
  url?: string;
  tags?: string[];
  metadata: {
    collectedAt: Date;
    collectorVersion: string;
    sourceUrl?: string;
  };
}

export interface VerificationResult {
  trailId: string;
  canonical: {
    name: string;
    distanceMiles: number;
    elevationGainFt: number;
    coordinates: Coordinate[];
    parkName: string;
    parkCode: string;
    stateCode: string;
    description?: string;
    trailType?: string;
  };
  confidence: {
    overall: number; // 0-100
    name: number;
    distance: number;
    elevation: number;
    coordinates: number;
  };
  sources: RawTrailData[];
  conflicts: Conflict[];
  needsManualReview: boolean;
}

export interface Conflict {
  field: string;
  values: Array<{ source: string; value: any }>;
  resolution: 'averaged' | 'majority' | 'highest_confidence' | 'manual_review';
  notes?: string;
}

export interface ValidatedTrail {
  name: string;
  parkName: string;
  parkCode: string;
  stateCode: string;
  countryCode: 'US';
  distanceMiles: number;
  elevationGainFt: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Very Hard';
  trailType: 'Loop' | 'Out and Back' | 'Point to Point';
  description: string;
  latitude: number;
  longitude: number;
  profilePoints: ProfilePoint[];
  tags: string[];
  metadata: {
    confidence: number;
    sources: string[];
    verifiedAt: Date;
    validatorVersion: string;
  };
}

export interface ProfilePoint {
  distanceMiles: number;
  elevationFt: number;
  lat?: number;
  lon?: number;
}

export interface CollectionReport {
  parkName: string;
  parkCode: string;
  totalCollected: number;
  totalVerified: number;
  totalValidated: number;
  totalInserted: number;
  rejected: {
    tooShort: number;
    lowElevation: number;
    lowConfidence: number;
    duplicate: number;
    other: number;
  };
  errors: Array<{
    trail: string;
    error: string;
    timestamp: Date;
  }>;
  duration: number; // ms
  timestamp: Date;
}

export interface NPSApiResponse {
  total: string;
  data: Array<{
    id: string;
    url: string;
    fullName: string;
    parkCode: string;
    description: string;
    latitude: string;
    longitude: string;
    activities?: Array<{ id: string; name: string }>;
    topics?: Array<{ id: string; name: string }>;
  }>;
}

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  rating?: number;
  user_ratings_total?: number;
  types: string[];
}

export interface ElevationPoint {
  elevation: number;
  location: { lat: number; lng: number };
  resolution: number;
}
