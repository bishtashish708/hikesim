import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  workoutTracker,
  formatDuration,
  formatDistance,
  formatElevation,
  formatPace,
} from '@/services/workoutTracker';
import { workoutApi, challengeApi } from '@/services/api';

const { width } = Dimensions.get('window');

type TrackingState = 'idle' | 'tracking' | 'paused';

export default function TrackWorkoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [trackingState, setTrackingState] = useState<TrackingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distance, setDistance] = useState(0);
  const [elevation, setElevation] = useState(0);
  const [steps, setSteps] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);

  // Save workout mutation
  const saveWorkout = useMutation({
    mutationFn: async (workoutData: any) => {
      const response = await workoutApi.create(workoutData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });

      // Check for new badges
      if (data.newBadges && data.newBadges.length > 0) {
        Alert.alert(
          '🏆 New Badge!',
          `You earned: ${data.newBadges.map((b: any) => b.name).join(', ')}`,
          [{ text: 'Awesome!' }]
        );
      }

      router.replace('/(tabs)/workouts');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to save workout. Please try again.');
      console.error('Save workout error:', error);
    },
  });

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  // Set up tracker callbacks
  useEffect(() => {
    workoutTracker.setCallbacks({
      onUpdate: (state) => {
        setElapsedSeconds(workoutTracker.getElapsedSeconds());
        setDistance(state.distanceMeters);
        setElevation(state.elevationGainMeters);
        setSteps(state.steps);
        setCurrentSpeed(state.currentSpeed);
      },
      onError: (error) => {
        Alert.alert('Tracking Error', error);
      },
    });

    return () => {
      workoutTracker.setCallbacks({});
    };
  }, []);

  const checkPermissions = async () => {
    const perms = await workoutTracker.checkPermissions();
    setHasPermissions(perms.location);
  };

  const handleStart = async () => {
    const started = await workoutTracker.start();
    if (started) {
      setTrackingState('tracking');
    }
  };

  const handlePause = () => {
    workoutTracker.pause();
    setTrackingState('paused');
  };

  const handleResume = () => {
    workoutTracker.resume();
    setTrackingState('tracking');
  };

  const handleStop = () => {
    Alert.alert(
      'End Workout',
      'Do you want to save this workout?',
      [
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            workoutTracker.discard();
            setTrackingState('idle');
            resetStats();
          },
        },
        {
          text: 'Save',
          onPress: async () => {
            const workoutData = await workoutTracker.stop();
            if (workoutData) {
              saveWorkout.mutate(workoutData);
            }
            setTrackingState('idle');
            resetStats();
          },
        },
        { text: 'Continue', style: 'cancel' },
      ]
    );
  };

  const resetStats = () => {
    setElapsedSeconds(0);
    setDistance(0);
    setElevation(0);
    setSteps(0);
    setCurrentSpeed(0);
  };

  if (hasPermissions === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="location-outline" size={64} color="#94a3b8" />
          <Text style={styles.permissionTitle}>Location Access Required</Text>
          <Text style={styles.permissionText}>
            HikeSim needs location access to track your workouts and calculate distance.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={checkPermissions}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (trackingState !== 'idle') {
              Alert.alert(
                'Leave Workout?',
                'You have an active workout. Going back will discard it.',
                [
                  { text: 'Stay', style: 'cancel' },
                  {
                    text: 'Discard & Leave',
                    style: 'destructive',
                    onPress: () => {
                      workoutTracker.discard();
                      router.back();
                    },
                  },
                ]
              );
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Workout</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Main Stats */}
      <View style={styles.mainStats}>
        {/* Timer */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>DURATION</Text>
          <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
        </View>

        {/* Distance */}
        <View style={styles.bigStatContainer}>
          <Text style={styles.bigStatValue}>{formatDistance(distance)}</Text>
          <Text style={styles.bigStatLabel}>Distance</Text>
        </View>
      </View>

      {/* Secondary Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={24} color="#6366f1" />
          <Text style={styles.statValue}>{formatElevation(elevation)}</Text>
          <Text style={styles.statLabel}>Elevation Gain</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="footsteps" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{steps.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Steps</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="speedometer" size={24} color="#10b981" />
          <Text style={styles.statValue}>{formatPace(currentSpeed)}</Text>
          <Text style={styles.statLabel}>Pace</Text>
        </View>
      </View>

      {/* Status Indicator */}
      <View style={styles.statusContainer}>
        {trackingState === 'idle' && (
          <View style={styles.statusBadge}>
            <Ionicons name="radio-button-off" size={12} color="#94a3b8" />
            <Text style={styles.statusText}>Ready to start</Text>
          </View>
        )}
        {trackingState === 'tracking' && (
          <View style={[styles.statusBadge, styles.statusActive]}>
            <Ionicons name="radio-button-on" size={12} color="#10b981" />
            <Text style={[styles.statusText, styles.statusActiveText]}>
              Tracking...
            </Text>
          </View>
        )}
        {trackingState === 'paused' && (
          <View style={[styles.statusBadge, styles.statusPaused]}>
            <Ionicons name="pause" size={12} color="#f59e0b" />
            <Text style={[styles.statusText, styles.statusPausedText]}>
              Paused
            </Text>
          </View>
        )}
      </View>

      {/* Control Buttons */}
      <View style={styles.controls}>
        {trackingState === 'idle' && (
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Ionicons name="play" size={32} color="#ffffff" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        )}

        {trackingState === 'tracking' && (
          <View style={styles.activeControls}>
            <TouchableOpacity style={styles.pauseButton} onPress={handlePause}>
              <Ionicons name="pause" size={28} color="#f59e0b" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
              <Ionicons name="stop" size={32} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {trackingState === 'paused' && (
          <View style={styles.activeControls}>
            <TouchableOpacity style={styles.resumeButton} onPress={handleResume}>
              <Ionicons name="play" size={28} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
              <Ionicons name="stop" size={32} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tips */}
      {trackingState === 'idle' && (
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Tips for accurate tracking:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.tipText}>Keep GPS enabled</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.tipText}>Stay in open areas for best signal</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.tipText}>Keep phone charged</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  mainStats: {
    backgroundColor: '#ffffff',
    paddingVertical: 32,
    alignItems: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 4,
  },
  timer: {
    fontSize: 56,
    fontWeight: '200',
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
  },
  bigStatContainer: {
    alignItems: 'center',
  },
  bigStatValue: {
    fontSize: 42,
    fontWeight: '600',
    color: '#10b981',
  },
  bigStatLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    gap: 6,
  },
  statusActive: {
    backgroundColor: '#ecfdf5',
  },
  statusPaused: {
    backgroundColor: '#fffbeb',
  },
  statusText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  statusActiveText: {
    color: '#10b981',
  },
  statusPausedText: {
    color: '#f59e0b',
  },
  controls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 50,
    gap: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  activeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  pauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  resumeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  tips: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#64748b',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
