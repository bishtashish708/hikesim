/**
 * Configuration for Multi-Agent Trail Collection System
 */

export const QUALITY_RULES = {
  // Minimum distance for out-and-back trails (user requirement)
  minDistanceMiles: 10,

  // Maximum distance (flag ultra-marathons for review)
  maxDistanceMiles: 50,

  // Minimum elevation gain (discard flat trails/roads)
  minElevationFt: 500,

  // Maximum elevation gain (flag extreme climbs)
  maxElevationFt: 10000,

  // Minimum confidence score to accept trail
  minConfidence: 75,

  // Required fields for valid trail
  requiredFields: [
    'name',
    'distanceMiles',
    'elevationGainFt',
    'parkName',
    'coordinates',
  ] as const,

  // Acceptable variance for cross-referencing
  distanceVariancePercent: 10, // ±10%
  elevationVarianceFt: 200,     // ±200 ft

  // Trail type requirements
  trailTypes: {
    // For out-and-back, require >= 10 miles
    'Out and Back': { minMiles: 10, minElevation: 500 },
    // For loops, more flexible
    'Loop': { minMiles: 5, minElevation: 500 },
    // For point-to-point, require >= 8 miles
    'Point to Point': { minMiles: 8, minElevation: 500 },
  },
};

export const API_CONFIGS = {
  nps: {
    baseUrl: 'https://developer.nps.gov/api/v1',
    apiKey: process.env.NPS_API_KEY || '',
    rateLimit: 1000, // requests per hour
  },

  googleMaps: {
    baseUrl: 'https://maps.googleapis.com/maps/api',
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    services: {
      textSearch: '/place/textsearch/json',
      placeDetails: '/place/details/json',
      elevation: '/elevation/json',
    },
  },

  openTopography: {
    baseUrl: 'https://portal.opentopography.org/API/v1',
    globalDemUrl: 'https://portal.opentopography.org/API/globaldem',
    // No API key needed for basic usage
  },
};

export const NATIONAL_PARKS = [
  {
    name: 'Yosemite National Park',
    code: 'yose',
    state: 'CA',
    bbox: { south: 37.5, west: -120.0, north: 38.2, east: -119.2 },
  },
  {
    name: 'Grand Canyon National Park',
    code: 'grca',
    state: 'AZ',
    bbox: { south: 35.9, west: -112.5, north: 36.5, east: -111.5 },
  },
  {
    name: 'Zion National Park',
    code: 'zion',
    state: 'UT',
    bbox: { south: 37.1, west: -113.2, north: 37.5, east: -112.8 },
  },
  {
    name: 'Rocky Mountain National Park',
    code: 'romo',
    state: 'CO',
    bbox: { south: 40.1, west: -105.9, north: 40.6, east: -105.4 },
  },
  {
    name: 'Acadia National Park',
    code: 'acad',
    state: 'ME',
    bbox: { south: 44.2, west: -68.4, north: 44.5, east: -68.1 },
  },
  {
    name: 'Grand Teton National Park',
    code: 'grte',
    state: 'WY',
    bbox: { south: 43.6, west: -111.1, north: 44.0, east: -110.4 },
  },
  {
    name: 'Olympic National Park',
    code: 'olym',
    state: 'WA',
    bbox: { south: 47.4, west: -124.7, north: 48.0, east: -122.8 },
  },
  {
    name: 'Yellowstone National Park',
    code: 'yell',
    state: 'WY',
    bbox: { south: 44.1, west: -111.2, north: 45.2, east: -109.8 },
  },
  {
    name: 'Glacier National Park',
    code: 'glac',
    state: 'MT',
    bbox: { south: 48.2, west: -114.5, north: 49.0, east: -113.3 },
  },
  {
    name: 'Great Smoky Mountains National Park',
    code: 'grsm',
    state: 'TN',
    bbox: { south: 35.4, west: -84.0, north: 35.8, east: -83.0 },
  },
] as const;

export const DIFFICULTY_THRESHOLDS = {
  Easy: {
    maxDistance: 5,
    maxElevation: 1000,
  },
  Moderate: {
    maxDistance: 10,
    maxElevation: 2500,
  },
  Hard: {
    maxDistance: 15,
    maxElevation: 4000,
  },
  'Very Hard': {
    minDistance: 15,
    minElevation: 4000,
  },
};

export const COLLECTION_CONFIG = {
  // Maximum trails to collect per park
  maxTrailsPerPark: 50,

  // Delay between API requests (ms)
  apiDelay: 1000,

  // Retry configuration
  maxRetries: 3,
  retryDelay: 2000,

  // Output paths
  paths: {
    raw: './data/raw',
    verified: './data/verified',
    logs: './data/logs',
  },
};
