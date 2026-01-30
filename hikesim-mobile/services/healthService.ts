import { Platform } from 'react-native';
import { workoutApi, healthApi, WorkoutData, WorkoutSource, HealthPlatform } from './api';

// Health service configuration
interface HealthConfig {
  // Whether native health integration is available
  // Will be true when using development builds with native modules
  nativeHealthAvailable: boolean;
}

const config: HealthConfig = {
  // In Expo Go, native health modules are not available
  // Set to true when building with EAS Build and native modules installed
  nativeHealthAvailable: false,
};

// Platform detection
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

// Get the appropriate health platform for this device
export function getDeviceHealthPlatform(): HealthPlatform | null {
  if (isIOS) return 'APPLE_HEALTH';
  if (isAndroid) return 'GOOGLE_FIT';
  return null;
}

// Check if native health is available
export function isNativeHealthAvailable(): boolean {
  return config.nativeHealthAvailable;
}

// Request health permissions (placeholder for native implementation)
export async function requestHealthPermissions(): Promise<boolean> {
  if (!config.nativeHealthAvailable) {
    console.log('Native health not available - using manual logging');
    return false;
  }

  // TODO: Implement with react-native-health (iOS) or react-native-google-fit (Android)
  // This would request read permissions for:
  // - Workouts/Activities
  // - Distance
  // - Heart rate
  // - Elevation
  // - Active energy burned

  return false;
}

// Fetch workouts from native health platform
export async function fetchWorkoutsFromHealth(
  startDate: Date,
  endDate: Date
): Promise<WorkoutData[]> {
  if (!config.nativeHealthAvailable) {
    console.log('Native health not available');
    return [];
  }

  // TODO: Implement with react-native-health (iOS) or react-native-google-fit (Android)
  // This would:
  // 1. Query HealthKit/Google Fit for workout samples
  // 2. Filter for hiking/walking activities
  // 3. Transform to our WorkoutData format
  // 4. Return the workouts

  return [];
}

// Sync workouts from health platform to our backend
export async function syncHealthWorkouts(
  startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
  endDate: Date = new Date()
): Promise<{ imported: number; skipped: number }> {
  const platform = getDeviceHealthPlatform();
  if (!platform) {
    throw new Error('No health platform available for this device');
  }

  // Fetch workouts from native health
  const workouts = await fetchWorkoutsFromHealth(startDate, endDate);

  if (workouts.length === 0) {
    return { imported: 0, skipped: 0 };
  }

  // Sync to backend
  const response = await workoutApi.syncFromHealth(platform as WorkoutSource, workouts);
  return response.data;
}

// Manual workout logging
export async function logManualWorkout(workout: Omit<WorkoutData, 'source'>): Promise<void> {
  await workoutApi.create({
    ...workout,
    source: 'MANUAL',
  });
}

// Connect to health platform
export async function connectHealthPlatform(): Promise<boolean> {
  const platform = getDeviceHealthPlatform();
  if (!platform) {
    return false;
  }

  // Request permissions first
  const hasPermissions = await requestHealthPermissions();
  if (!hasPermissions && config.nativeHealthAvailable) {
    return false;
  }

  // Record the connection in our backend
  await healthApi.connect(platform, {
    connectedAt: new Date().toISOString(),
    platform: Platform.OS,
    nativeAvailable: config.nativeHealthAvailable,
  });

  return true;
}

// Disconnect from health platform
export async function disconnectHealthPlatform(): Promise<void> {
  const platform = getDeviceHealthPlatform();
  if (!platform) return;

  await healthApi.disconnect(platform);
}

// Utility: Convert meters to miles
export function metersToMiles(meters: number): number {
  return meters * 0.000621371;
}

// Utility: Convert meters to feet
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

// Utility: Convert seconds to minutes
export function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

// Format duration for display
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

// Format distance for display
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

// Format elevation for display
export function formatElevation(feet: number): string {
  if (feet >= 1000) {
    return `${(feet / 1000).toFixed(1)}k ft`;
  }
  return `${Math.round(feet)} ft`;
}

// Get workout type label
export function getWorkoutTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    HIKE: 'Hike',
    WALK: 'Walk',
    RUN: 'Run',
    TREADMILL: 'Treadmill',
    STAIR_CLIMBER: 'Stair Climber',
    OTHER: 'Other',
  };
  return labels[type] || type;
}

// Get source label
export function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    MANUAL: 'Manual',
    APPLE_HEALTH: 'Apple Health',
    GOOGLE_FIT: 'Google Fit',
    STRAVA: 'Strava',
    GARMIN: 'Garmin',
    FITBIT: 'Fitbit',
  };
  return labels[source] || source;
}
