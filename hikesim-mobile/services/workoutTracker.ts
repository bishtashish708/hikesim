/**
 * Native Workout Tracker
 * Tracks steps, distance, and location in real-time using device sensors
 */

import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { workoutApi, WorkoutData } from './api';

// Workout state
interface WorkoutState {
  isTracking: boolean;
  isPaused: boolean;
  startTime: Date | null;
  pausedTime: number; // Total paused milliseconds
  pauseStartTime: Date | null;

  // Metrics
  steps: number;
  distanceMeters: number;
  elevationGainMeters: number;
  currentElevation: number | null;
  minElevation: number | null;
  maxElevation: number | null;

  // Location tracking
  locations: Location.LocationObject[];
  currentSpeed: number; // meters per second
}

interface WorkoutCallbacks {
  onUpdate?: (state: WorkoutState) => void;
  onLocationUpdate?: (location: Location.LocationObject) => void;
  onError?: (error: string) => void;
}

// Singleton tracker instance
class WorkoutTracker {
  private state: WorkoutState = this.getInitialState();
  private callbacks: WorkoutCallbacks = {};
  private locationSubscription: Location.LocationSubscription | null = null;
  private pedometerSubscription: { remove: () => void } | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  private getInitialState(): WorkoutState {
    return {
      isTracking: false,
      isPaused: false,
      startTime: null,
      pausedTime: 0,
      pauseStartTime: null,
      steps: 0,
      distanceMeters: 0,
      elevationGainMeters: 0,
      currentElevation: null,
      minElevation: null,
      maxElevation: null,
      locations: [],
      currentSpeed: 0,
    };
  }

  // Check if tracking is available
  async checkPermissions(): Promise<{ location: boolean; pedometer: boolean }> {
    const [locationStatus, pedometerAvailable] = await Promise.all([
      Location.requestForegroundPermissionsAsync(),
      Pedometer.isAvailableAsync(),
    ]);

    return {
      location: locationStatus.status === 'granted',
      pedometer: pedometerAvailable,
    };
  }

  // Request all necessary permissions
  async requestPermissions(): Promise<boolean> {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') {
      this.callbacks.onError?.('Location permission is required to track workouts');
      return false;
    }

    // Request background location for when app is minimized
    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    if (background !== 'granted') {
      console.log('Background location not granted - tracking may stop when app is minimized');
    }

    return true;
  }

  // Set callbacks for updates
  setCallbacks(callbacks: WorkoutCallbacks) {
    this.callbacks = callbacks;
  }

  // Get current state
  getState(): WorkoutState {
    return { ...this.state };
  }

  // Calculate elapsed time in seconds (excluding paused time)
  getElapsedSeconds(): number {
    if (!this.state.startTime) return 0;

    let elapsed = Date.now() - this.state.startTime.getTime() - this.state.pausedTime;

    if (this.state.isPaused && this.state.pauseStartTime) {
      elapsed -= Date.now() - this.state.pauseStartTime.getTime();
    }

    return Math.floor(elapsed / 1000);
  }

  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  // Start tracking
  async start(): Promise<boolean> {
    if (this.state.isTracking) {
      console.log('Already tracking');
      return true;
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return false;

    // Reset state
    this.state = {
      ...this.getInitialState(),
      isTracking: true,
      startTime: new Date(),
    };

    // Start location tracking
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000, // Update every 3 seconds
        distanceInterval: 5, // Or every 5 meters
      },
      (location) => this.handleLocationUpdate(location)
    );

    // Start pedometer (if available)
    const pedometerAvailable = await Pedometer.isAvailableAsync();
    if (pedometerAvailable) {
      this.pedometerSubscription = Pedometer.watchStepCount((result) => {
        this.state.steps = result.steps;
        this.notifyUpdate();
      });
    }

    // Periodic update for elapsed time
    this.updateInterval = setInterval(() => {
      this.notifyUpdate();
    }, 1000);

    this.notifyUpdate();
    return true;
  }

  // Handle location updates
  private handleLocationUpdate(location: Location.LocationObject) {
    if (this.state.isPaused) return;

    const prevLocation = this.state.locations[this.state.locations.length - 1];

    // Calculate distance from previous point
    if (prevLocation) {
      const distance = this.calculateDistance(
        prevLocation.coords.latitude,
        prevLocation.coords.longitude,
        location.coords.latitude,
        location.coords.longitude
      );

      // Only add if moved more than 2 meters (filter GPS noise)
      if (distance > 2) {
        this.state.distanceMeters += distance;
      }

      // Calculate elevation gain
      if (location.coords.altitude !== null && prevLocation.coords.altitude !== null) {
        const elevationChange = location.coords.altitude - prevLocation.coords.altitude;
        if (elevationChange > 0) {
          this.state.elevationGainMeters += elevationChange;
        }
      }
    }

    // Update elevation tracking
    if (location.coords.altitude !== null) {
      this.state.currentElevation = location.coords.altitude;
      if (this.state.minElevation === null || location.coords.altitude < this.state.minElevation) {
        this.state.minElevation = location.coords.altitude;
      }
      if (this.state.maxElevation === null || location.coords.altitude > this.state.maxElevation) {
        this.state.maxElevation = location.coords.altitude;
      }
    }

    // Update speed
    this.state.currentSpeed = location.coords.speed || 0;

    // Store location
    this.state.locations.push(location);

    this.callbacks.onLocationUpdate?.(location);
    this.notifyUpdate();
  }

  // Pause tracking
  pause() {
    if (!this.state.isTracking || this.state.isPaused) return;

    this.state.isPaused = true;
    this.state.pauseStartTime = new Date();
    this.notifyUpdate();
  }

  // Resume tracking
  resume() {
    if (!this.state.isTracking || !this.state.isPaused) return;

    if (this.state.pauseStartTime) {
      this.state.pausedTime += Date.now() - this.state.pauseStartTime.getTime();
    }
    this.state.isPaused = false;
    this.state.pauseStartTime = null;
    this.notifyUpdate();
  }

  // Stop tracking and save workout
  async stop(): Promise<WorkoutData | null> {
    if (!this.state.isTracking) return null;

    // Stop all subscriptions
    this.locationSubscription?.remove();
    this.pedometerSubscription?.remove();
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.state.isTracking = false;

    // Build workout data
    const elapsedSeconds = this.getElapsedSeconds();
    const distanceMiles = this.state.distanceMeters * 0.000621371;
    const elevationGainFt = this.state.elevationGainMeters * 3.28084;

    const workout: WorkoutData = {
      source: 'MANUAL',
      workoutType: 'HIKE',
      distanceMiles: Math.round(distanceMiles * 100) / 100,
      elevationGainFt: Math.round(elevationGainFt),
      durationMinutes: Math.round(elapsedSeconds / 60),
      startedAt: this.state.startTime!.toISOString(),
      endedAt: new Date().toISOString(),
      startLatitude: this.state.locations[0]?.coords.latitude,
      startLongitude: this.state.locations[0]?.coords.longitude,
      routeData: {
        locations: this.state.locations.map((loc) => ({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          alt: loc.coords.altitude,
          timestamp: loc.timestamp,
        })),
        steps: this.state.steps,
        minElevation: this.state.minElevation,
        maxElevation: this.state.maxElevation,
      },
    };

    // Reset state
    this.state = this.getInitialState();

    return workout;
  }

  // Discard current workout without saving
  discard() {
    this.locationSubscription?.remove();
    this.pedometerSubscription?.remove();
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.state = this.getInitialState();
  }

  private notifyUpdate() {
    this.callbacks.onUpdate?.(this.getState());
  }
}

// Export singleton instance
export const workoutTracker = new WorkoutTracker();

// Utility functions
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDistance(meters: number): string {
  const miles = meters * 0.000621371;
  if (miles < 0.1) {
    const feet = meters * 3.28084;
    return `${Math.round(feet)} ft`;
  }
  return `${miles.toFixed(2)} mi`;
}

export function formatElevation(meters: number): string {
  const feet = meters * 3.28084;
  return `${Math.round(feet)} ft`;
}

export function formatSpeed(metersPerSecond: number): string {
  const mph = metersPerSecond * 2.23694;
  return `${mph.toFixed(1)} mph`;
}

export function formatPace(metersPerSecond: number): string {
  if (metersPerSecond <= 0) return '--:--';
  const milesPerSecond = metersPerSecond * 0.000621371;
  const secondsPerMile = 1 / milesPerSecond;
  const mins = Math.floor(secondsPerMile / 60);
  const secs = Math.round(secondsPerMile % 60);
  return `${mins}:${secs.toString().padStart(2, '0')} /mi`;
}
