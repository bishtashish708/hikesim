import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Get your computer's local IP for development
// Run: ifconfig | grep "inet " | grep -v 127.0.0.1
// Use that IP instead of localhost when testing on physical devices
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.225:3000/api'  // Your local IP for physical device testing
  : 'https://your-production-url.vercel.app/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (token expired/invalid)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token is invalid, clear it
      await SecureStore.deleteItemAsync('authToken');
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const hikeApi = {
  getAll: (params?: any) => apiClient.get('/hikes/by-region', { params }),
  getById: (id: string) => apiClient.get(`/hikes/${id}`),
  getCountries: () => apiClient.get('/geo/countries'),
  getRegions: (country: string) => apiClient.get(`/geo/regions`, { params: { country } }),
};

export const trainingApi = {
  generateQuickPlan: (data: any) => apiClient.post('/ai/generate-quick-plan', data),
  generateAdvancedPlan: (data: any) => apiClient.post('/ai/generate-advanced-plan', data),
  getMyPlans: () => apiClient.get('/training-plans'),
  getPlanById: (id: string) => apiClient.get(`/training-plans/${id}`),
};

export const authApi = {
  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),
  signup: (data: { name?: string; email: string; password: string }) =>
    apiClient.post('/auth/signup', data),
  getProfile: () =>
    apiClient.get('/auth/profile'),
  logout: () =>
    apiClient.post('/auth/logout'),
  // Google OAuth will be handled separately
};

// Workout types
export type WorkoutType = 'HIKE' | 'WALK' | 'RUN' | 'TREADMILL' | 'STAIR_CLIMBER' | 'OTHER';
export type WorkoutSource = 'MANUAL' | 'APPLE_HEALTH' | 'GOOGLE_FIT' | 'STRAVA' | 'GARMIN' | 'FITBIT';

export interface WorkoutData {
  source?: WorkoutSource;
  externalId?: string;
  workoutType?: WorkoutType;
  distanceMiles?: number;
  elevationGainFt?: number;
  durationMinutes?: number;
  caloriesBurned?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  startedAt: string;
  endedAt?: string;
  startLatitude?: number;
  startLongitude?: number;
  routeData?: unknown;
  title?: string;
  notes?: string;
}

export interface Workout extends WorkoutData {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export const workoutApi = {
  // Get all workouts with optional filters
  getAll: (params?: { limit?: number; offset?: number; startDate?: string; endDate?: string }) =>
    apiClient.get('/workouts', { params }),

  // Create a new workout (manual logging)
  create: (data: WorkoutData) =>
    apiClient.post('/workouts', data),

  // Batch sync workouts from health platform
  syncFromHealth: (platform: WorkoutSource, workouts: WorkoutData[]) =>
    apiClient.post('/health/sync', { platform, workouts }),
};

export type HealthPlatform = 'APPLE_HEALTH' | 'GOOGLE_FIT' | 'STRAVA' | 'GARMIN' | 'FITBIT';

export interface HealthConnection {
  id: string;
  platform: HealthPlatform;
  isConnected: boolean;
  lastSyncAt: string | null;
  metadata: unknown;
  createdAt: string;
}

export const healthApi = {
  // Get all health connections
  getConnections: () =>
    apiClient.get('/health/connections'),

  // Connect to a health platform
  connect: (platform: HealthPlatform, metadata?: unknown) =>
    apiClient.post('/health/connections', { platform, isConnected: true, metadata }),

  // Disconnect from a health platform
  disconnect: (platform: HealthPlatform) =>
    apiClient.delete(`/health/connections?platform=${platform}`),
};

// Challenge types
export type ChallengeDifficulty = 'EASY' | 'MODERATE' | 'HARD' | 'EXTREME';
export type ChallengeStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ABANDONED';
export type StreakMode = 'STRICT' | 'GRACE_PERIOD' | 'FLEXIBLE';

export interface Milestone {
  distanceMiles: number;
  name: string;
  description?: string;
  badgeId?: string;
}

export interface Badge {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  iconName?: string;
  category: string;
  rarity: string;
  points: number;
}

export interface VirtualChallenge {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  totalDistanceMiles: number;
  totalElevationGainFt?: number;
  difficulty: ChallengeDifficulty;
  estimatedDays: number;
  maxDaysAllowed?: number;
  streakMode: StreakMode;
  milestones: Milestone[];
  completionPoints: number;
  isFeatured: boolean;
  participantCount: number;
  userStatus?: ChallengeStatus | null;
  completionBadge?: Badge;
  sourceHike?: {
    id: string;
    name: string;
    parkName?: string;
    stateCode?: string;
    countryCode?: string;
  };
}

export interface ChallengeProgress {
  id: string;
  challengeId: string;
  challengeName: string;
  challengeDescription: string;
  challengeImageUrl?: string;
  challengeDifficulty: ChallengeDifficulty;
  totalDistanceMiles: number;
  totalElevationGainFt?: number;
  distanceCompleted: number;
  elevationCompleted: number;
  progressPercent: number;
  status: ChallengeStatus;
  currentStreak: number;
  longestStreak: number;
  pointsEarned: number;
  streakMultiplier: number;
  milestonesReached: number[];
  milestones: Milestone[];
  completionBadge?: Badge;
  startedAt: string;
  completedAt?: string;
  lastActivityDate?: string;
}

export interface LogProgressResult {
  progress: ChallengeProgress;
  session: {
    distanceAdded: number;
    basePoints: number;
    streakBonus: number;
    milestonePoints: number;
    sessionPoints: number;
    completionBonus: number;
    currentStreak: number;
    multiplier: number;
  };
  milestonesReached: Milestone[];
  isCompleted: boolean;
  badge?: Badge;
}

export const challengeApi = {
  // Get all available challenges
  getAll: (params?: { featured?: boolean; difficulty?: ChallengeDifficulty; streakMode?: StreakMode }) =>
    apiClient.get('/challenges', { params }),

  // Get challenge details
  getById: (id: string) =>
    apiClient.get(`/challenges/${id}`),

  // Join a challenge
  join: (challengeId: string) =>
    apiClient.post(`/challenges/${challengeId}/join`),

  // Log progress for a challenge
  logProgress: (challengeId: string, data: { distanceMiles: number; elevationFt?: number; workoutId?: string; date?: string }) =>
    apiClient.post(`/challenges/${challengeId}/log-progress`, data),

  // Get user's challenge progress
  getMyProgress: (status?: 'active' | 'completed' | 'all') =>
    apiClient.get('/challenges/my-progress', { params: { status } }),
};

// Leaderboard types
export type LeaderboardType = 'distance' | 'elevation' | 'workouts' | 'streak' | 'challenges' | 'points';
export type TimeFrame = 'weekly' | 'monthly' | 'allTime';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  value: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  type: LeaderboardType;
  timeFrame: TimeFrame;
  leaderboard: LeaderboardEntry[];
  currentUserRank: { rank: number; value: number } | null;
  updatedAt: string;
}

export const leaderboardApi = {
  // Get global leaderboard
  get: (params?: { type?: LeaderboardType; timeFrame?: TimeFrame; limit?: number }) =>
    apiClient.get<LeaderboardResponse>('/leaderboard', { params }),
};

// Badge API
export const badgeApi = {
  // Get user's badges
  getMyBadges: () => apiClient.get('/badges/my-badges'),

  // Get all available badges
  getAll: () => apiClient.get('/badges'),
};

export default apiClient;
