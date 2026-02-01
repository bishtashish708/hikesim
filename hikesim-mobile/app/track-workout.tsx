import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  workoutTracker,
  formatDuration,
  formatDistance,
  formatElevation,
  formatPace,
} from '@/services/workoutTracker';
import { workoutApi, challengeApi, WorkoutData } from '@/services/api';

const { width } = Dimensions.get('window');

type TrackingState = 'idle' | 'tracking' | 'paused';
type WorkoutMode = 'outdoor' | 'treadmill' | 'stairmaster' | 'manual';

const WORKOUT_MODES = [
  { id: 'outdoor' as WorkoutMode, label: 'Outdoor Hike', icon: 'trail-sign', description: 'GPS tracking' },
  { id: 'treadmill' as WorkoutMode, label: 'Treadmill', icon: 'fitness', description: 'Indoor walking/running' },
  { id: 'stairmaster' as WorkoutMode, label: 'Stair Climber', icon: 'trending-up', description: 'Stair machine' },
  { id: 'manual' as WorkoutMode, label: 'Manual Entry', icon: 'create', description: 'Enter distance manually' },
];

export default function TrackWorkoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [workoutMode, setWorkoutMode] = useState<WorkoutMode | null>(null);
  const [trackingState, setTrackingState] = useState<TrackingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distance, setDistance] = useState(0);
  const [elevation, setElevation] = useState(0);
  const [steps, setSteps] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Manual entry fields
  const [manualDistance, setManualDistance] = useState('');
  const [manualElevation, setManualElevation] = useState('');
  const [manualDuration, setManualDuration] = useState('');

  // Challenge selection
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  // Fetch active challenges
  const { data: challengesData } = useQuery({
    queryKey: ['my-challenges', 'active'],
    queryFn: () => challengeApi.getMyProgress('active'),
  });

  const activeChallenges = challengesData?.data?.progress || [];

  // Save workout mutation
  const saveWorkout = useMutation({
    mutationFn: async (workoutData: WorkoutData) => {
      const response = await workoutApi.create(workoutData);
      return response.data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });

      // If a challenge was selected, log progress
      if (selectedChallengeId && data.workout) {
        try {
          const distanceMiles = data.workout.distanceMiles || 0;
          const elevationFt = data.workout.elevationGainFt || 0;

          if (distanceMiles > 0) {
            await challengeApi.logProgress(selectedChallengeId, {
              distanceMiles,
              elevationFt,
              workoutId: data.workout.id,
            });
            queryClient.invalidateQueries({ queryKey: ['my-challenges'] });
          }
        } catch (error) {
          console.error('Failed to log challenge progress:', error);
        }
      }

      // Check for new badges
      if (data.newBadges && data.newBadges.length > 0) {
        Alert.alert(
          '🏆 New Badge!',
          `You earned: ${data.newBadges.map((b: any) => b.name).join(', ')}`,
          [{ text: 'Awesome!', onPress: () => router.replace('/(tabs)/workouts') }]
        );
      } else {
        router.replace('/(tabs)/workouts');
      }
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
        setPermissionError(error);
      },
    });

    return () => {
      workoutTracker.setCallbacks({});
    };
  }, []);

  const checkPermissions = async () => {
    try {
      const perms = await workoutTracker.checkPermissions();
      setHasPermissions(perms.location);
    } catch (error) {
      console.log('Permission check failed:', error);
      setHasPermissions(false);
      setPermissionError('Location services may not be available');
    }
  };

  const handleStart = async () => {
    if (workoutMode === 'outdoor') {
      const started = await workoutTracker.start();
      if (started) {
        setTrackingState('tracking');
        setPermissionError(null);
      }
    } else {
      // For indoor workouts, just start the timer
      setTrackingState('tracking');
      workoutTracker.start(); // Start for timer, ignore GPS errors
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
            setWorkoutMode(null);
          },
        },
        {
          text: 'Save',
          onPress: async () => {
            await saveCurrentWorkout();
          },
        },
        { text: 'Continue', style: 'cancel' },
      ]
    );
  };

  const saveCurrentWorkout = async () => {
    let workoutData: WorkoutData;

    if (workoutMode === 'outdoor') {
      const data = await workoutTracker.stop();
      if (!data) return;
      workoutData = data;
    } else if (workoutMode === 'manual') {
      workoutData = {
        source: 'MANUAL',
        workoutType: 'HIKE',
        distanceMiles: parseFloat(manualDistance) || 0,
        elevationGainFt: parseFloat(manualElevation) || 0,
        durationMinutes: parseFloat(manualDuration) || 0,
        startedAt: new Date(Date.now() - (parseFloat(manualDuration) || 0) * 60000).toISOString(),
        endedAt: new Date().toISOString(),
      };
    } else {
      // Treadmill or stairmaster
      const elapsed = workoutTracker.getElapsedSeconds();
      workoutTracker.discard();

      workoutData = {
        source: 'MANUAL',
        workoutType: workoutMode === 'treadmill' ? 'TREADMILL' : 'STAIR_CLIMBER',
        distanceMiles: distance * 0.000621371 || parseFloat(manualDistance) || 0,
        elevationGainFt: elevation * 3.28084 || parseFloat(manualElevation) || 0,
        durationMinutes: Math.round(elapsed / 60),
        startedAt: new Date(Date.now() - elapsed * 1000).toISOString(),
        endedAt: new Date().toISOString(),
      };
    }

    setTrackingState('idle');
    resetStats();
    saveWorkout.mutate(workoutData);
  };

  const resetStats = () => {
    setElapsedSeconds(0);
    setDistance(0);
    setElevation(0);
    setSteps(0);
    setCurrentSpeed(0);
    setManualDistance('');
    setManualElevation('');
    setManualDuration('');
  };

  // Mode selection screen
  if (!workoutMode) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Start Workout</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.modeList}>
          <Text style={styles.modeListTitle}>Select Workout Type</Text>

          {WORKOUT_MODES.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={styles.modeCard}
              onPress={() => setWorkoutMode(mode.id)}
            >
              <View style={styles.modeIconContainer}>
                <Ionicons name={mode.icon as any} size={28} color="#10b981" />
              </View>
              <View style={styles.modeInfo}>
                <Text style={styles.modeLabel}>{mode.label}</Text>
                <Text style={styles.modeDescription}>{mode.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>
          ))}

          {/* Challenge Selection */}
          {activeChallenges.length > 0 && (
            <View style={styles.challengeSection}>
              <Text style={styles.challengeSectionTitle}>Track for Challenge</Text>
              <TouchableOpacity
                style={styles.challengeSelector}
                onPress={() => setShowChallengeModal(true)}
              >
                <Ionicons name="trophy" size={20} color="#f59e0b" />
                <Text style={styles.challengeSelectorText}>
                  {selectedChallengeId
                    ? activeChallenges.find((c: any) => c.challengeId === selectedChallengeId)?.challengeName
                    : 'Select a challenge (optional)'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {/* Gym Equipment Info */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#6366f1" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Gym Equipment</Text>
              <Text style={styles.infoText}>
                For treadmills and stair climbers, enter your distance/elevation after your workout, or use the timer to track duration.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Challenge Selection Modal */}
        <Modal
          visible={showChallengeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowChallengeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Challenge</Text>
                <TouchableOpacity onPress={() => setShowChallengeModal(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.challengeOption, !selectedChallengeId && styles.challengeOptionSelected]}
                onPress={() => {
                  setSelectedChallengeId(null);
                  setShowChallengeModal(false);
                }}
              >
                <Text style={styles.challengeOptionText}>No challenge</Text>
              </TouchableOpacity>

              {activeChallenges.map((challenge: any) => (
                <TouchableOpacity
                  key={challenge.challengeId}
                  style={[
                    styles.challengeOption,
                    selectedChallengeId === challenge.challengeId && styles.challengeOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedChallengeId(challenge.challengeId);
                    setShowChallengeModal(false);
                  }}
                >
                  <View>
                    <Text style={styles.challengeOptionText}>{challenge.challengeName}</Text>
                    <Text style={styles.challengeOptionProgress}>
                      {challenge.progressPercent}% complete • {challenge.distanceCompleted.toFixed(1)} mi
                    </Text>
                  </View>
                  {selectedChallengeId === challenge.challengeId && (
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Manual entry mode
  if (workoutMode === 'manual') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setWorkoutMode(null)}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manual Entry</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.manualForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Distance (miles)</Text>
            <TextInput
              style={styles.input}
              value={manualDistance}
              onChangeText={setManualDistance}
              placeholder="0.0"
              keyboardType="decimal-pad"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Elevation Gain (feet)</Text>
            <TextInput
              style={styles.input}
              value={manualElevation}
              onChangeText={setManualElevation}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={manualDuration}
              onChangeText={setManualDuration}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {selectedChallengeId && (
            <View style={styles.selectedChallengeCard}>
              <Ionicons name="trophy" size={20} color="#f59e0b" />
              <Text style={styles.selectedChallengeText}>
                Progress will be added to:{' '}
                {activeChallenges.find((c: any) => c.challengeId === selectedChallengeId)?.challengeName}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!manualDistance || parseFloat(manualDistance) <= 0) && styles.saveButtonDisabled,
            ]}
            onPress={() => {
              if (manualDistance && parseFloat(manualDistance) > 0) {
                saveCurrentWorkout();
              }
            }}
            disabled={!manualDistance || parseFloat(manualDistance) <= 0}
          >
            <Ionicons name="checkmark" size={24} color="#ffffff" />
            <Text style={styles.saveButtonText}>Save Workout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Active tracking screen (outdoor, treadmill, stairmaster)
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
                      setWorkoutMode(null);
                    },
                  },
                ]
              );
            } else {
              setWorkoutMode(null);
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {workoutMode === 'outdoor' ? 'Outdoor Hike' : workoutMode === 'treadmill' ? 'Treadmill' : 'Stair Climber'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Error Banner */}
      {permissionError && workoutMode === 'outdoor' && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={20} color="#f59e0b" />
          <Text style={styles.errorBannerText}>{permissionError}</Text>
        </View>
      )}

      {/* Main Stats */}
      <View style={styles.mainStats}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>DURATION</Text>
          <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
        </View>

        <View style={styles.bigStatContainer}>
          <Text style={styles.bigStatValue}>
            {workoutMode === 'outdoor' ? formatDistance(distance) : '--'}
          </Text>
          <Text style={styles.bigStatLabel}>Distance</Text>
        </View>
      </View>

      {/* Secondary Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={24} color="#6366f1" />
          <Text style={styles.statValue}>
            {workoutMode === 'outdoor' ? formatElevation(elevation) : '--'}
          </Text>
          <Text style={styles.statLabel}>Elevation</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="footsteps" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{steps > 0 ? steps.toLocaleString() : '--'}</Text>
          <Text style={styles.statLabel}>Steps</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="speedometer" size={24} color="#10b981" />
          <Text style={styles.statValue}>
            {workoutMode === 'outdoor' && currentSpeed > 0 ? formatPace(currentSpeed) : '--'}
          </Text>
          <Text style={styles.statLabel}>Pace</Text>
        </View>
      </View>

      {/* Indoor Equipment Manual Entry */}
      {(workoutMode === 'treadmill' || workoutMode === 'stairmaster') && trackingState !== 'idle' && (
        <View style={styles.indoorEntry}>
          <Text style={styles.indoorEntryTitle}>Enter from machine display:</Text>
          <View style={styles.indoorInputRow}>
            <View style={styles.indoorInputGroup}>
              <Text style={styles.indoorInputLabel}>Distance (mi)</Text>
              <TextInput
                style={styles.indoorInput}
                value={manualDistance}
                onChangeText={setManualDistance}
                placeholder="0.0"
                keyboardType="decimal-pad"
                placeholderTextColor="#94a3b8"
              />
            </View>
            {workoutMode === 'stairmaster' && (
              <View style={styles.indoorInputGroup}>
                <Text style={styles.indoorInputLabel}>Floors</Text>
                <TextInput
                  style={styles.indoorInput}
                  value={manualElevation}
                  onChangeText={(v) => setManualElevation(String(parseFloat(v || '0') * 10))}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Selected Challenge */}
      {selectedChallengeId && (
        <View style={styles.trackingChallengeCard}>
          <Ionicons name="trophy" size={16} color="#f59e0b" />
          <Text style={styles.trackingChallengeText}>
            Tracking for: {activeChallenges.find((c: any) => c.challengeId === selectedChallengeId)?.challengeName}
          </Text>
        </View>
      )}

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
              {workoutMode === 'outdoor' ? 'Tracking GPS...' : 'Timer running...'}
            </Text>
          </View>
        )}
        {trackingState === 'paused' && (
          <View style={[styles.statusBadge, styles.statusPaused]}>
            <Ionicons name="pause" size={12} color="#f59e0b" />
            <Text style={[styles.statusText, styles.statusPausedText]}>Paused</Text>
          </View>
        )}
      </View>

      {/* Control Buttons */}
      <View style={styles.controls}>
        {trackingState === 'idle' && (
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Ionicons name="play" size={32} color="#ffffff" />
            <Text style={styles.startButtonText}>Start</Text>
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
  modeList: {
    flex: 1,
    padding: 20,
  },
  modeListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 16,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modeIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#ecfdf5',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  modeDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  challengeSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  challengeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  challengeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  challengeSelectorText: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4338ca',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#6366f1',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  challengeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
  },
  challengeOptionSelected: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  challengeOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  challengeOptionProgress: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  manualForm: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#0f172a',
  },
  selectedChallengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  selectedChallengeText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  mainStats: {
    backgroundColor: '#ffffff',
    paddingVertical: 24,
    alignItems: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 4,
  },
  timer: {
    fontSize: 48,
    fontWeight: '200',
    color: '#0f172a',
    fontVariant: ['tabular-nums'],
  },
  bigStatContainer: {
    alignItems: 'center',
  },
  bigStatValue: {
    fontSize: 36,
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
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  indoorEntry: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  indoorEntryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  indoorInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  indoorInputGroup: {
    flex: 1,
  },
  indoorInputLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  indoorInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  trackingChallengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  trackingChallengeText: {
    fontSize: 13,
    color: '#92400e',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 12,
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
    paddingVertical: 18,
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
});
