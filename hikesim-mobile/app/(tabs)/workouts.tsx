import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { workoutApi, WorkoutData, WorkoutType } from '@/services/api';
import {
  formatDuration,
  formatDistance,
  formatElevation,
  getWorkoutTypeLabel,
  getSourceLabel,
  getDeviceHealthPlatform,
  isNativeHealthAvailable,
} from '@/services/healthService';

type WorkoutTypeOption = {
  value: WorkoutType;
  label: string;
  icon: string;
};

const WORKOUT_TYPES: WorkoutTypeOption[] = [
  { value: 'HIKE', label: 'Hike', icon: 'trail-sign' },
  { value: 'WALK', label: 'Walk', icon: 'walk' },
  { value: 'RUN', label: 'Run', icon: 'fitness' },
  { value: 'TREADMILL', label: 'Treadmill', icon: 'speedometer' },
  { value: 'STAIR_CLIMBER', label: 'Stair Climber', icon: 'trending-up' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function WorkoutsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  // Form state for new workout
  const [workoutType, setWorkoutType] = useState<WorkoutType>('HIKE');
  const [distance, setDistance] = useState('');
  const [elevation, setElevation] = useState('');
  const [duration, setDuration] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch workouts
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => workoutApi.getAll({ limit: 50 }),
  });

  const workouts = data?.data?.workouts || [];
  const stats = data?.data?.stats || {
    totalWorkouts: 0,
    totalDistanceMiles: 0,
    totalElevationGainFt: 0,
    totalDurationMinutes: 0,
  };

  // Create workout mutation
  const createWorkout = useMutation({
    mutationFn: (workout: WorkoutData) => workoutApi.create(workout),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      setShowLogModal(false);
      resetForm();
      Alert.alert('Success', 'Workout logged successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to log workout');
    },
  });

  const resetForm = () => {
    setWorkoutType('HIKE');
    setDistance('');
    setElevation('');
    setDuration('');
    setTitle('');
    setNotes('');
    setWorkoutDate(new Date());
  };

  const handleSubmit = () => {
    if (!duration) {
      Alert.alert('Error', 'Duration is required');
      return;
    }

    const workout: WorkoutData = {
      source: 'MANUAL',
      workoutType,
      distanceMiles: distance ? parseFloat(distance) : undefined,
      elevationGainFt: elevation ? parseFloat(elevation) : undefined,
      durationMinutes: parseInt(duration),
      startedAt: workoutDate.toISOString(),
      title: title || `${getWorkoutTypeLabel(workoutType)} on ${workoutDate.toLocaleDateString()}`,
      notes: notes || undefined,
    };

    createWorkout.mutate(workout);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const healthPlatform = getDeviceHealthPlatform();
  const nativeAvailable = isNativeHealthAvailable();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>All Time Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDistance(stats.totalDistanceMiles)}
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatElevation(stats.totalElevationGainFt)}
              </Text>
              <Text style={styles.statLabel}>Elevation</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDuration(stats.totalDurationMinutes)}
              </Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
          </View>
        </View>

        {/* Health Connection Banner */}
        <View style={styles.healthBanner}>
          <View style={styles.healthBannerContent}>
            <Ionicons
              name={healthPlatform === 'APPLE_HEALTH' ? 'heart' : 'fitness'}
              size={24}
              color={nativeAvailable ? '#10b981' : '#94a3b8'}
            />
            <View style={styles.healthBannerText}>
              <Text style={styles.healthBannerTitle}>
                {healthPlatform === 'APPLE_HEALTH' ? 'Apple Health' : 'Google Fit'}
              </Text>
              <Text style={styles.healthBannerSubtitle}>
                {nativeAvailable
                  ? 'Connected - Auto-syncing workouts'
                  : 'Use manual logging (native sync requires dev build)'}
              </Text>
            </View>
          </View>
        </View>

        {/* Workout History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>

          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Failed to load workouts</Text>
            </View>
          ) : workouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No workouts yet</Text>
              <Text style={styles.emptyText}>
                Log your first workout to start tracking your progress
              </Text>
            </View>
          ) : (
            workouts.map((workout: any) => (
              <View key={workout.id} style={styles.workoutCard}>
                <View style={styles.workoutHeader}>
                  <View style={styles.workoutTypeIcon}>
                    <Ionicons
                      name={
                        WORKOUT_TYPES.find(t => t.value === workout.workoutType)?.icon as any || 'fitness'
                      }
                      size={20}
                      color="#10b981"
                    />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutTitle}>
                      {workout.title || getWorkoutTypeLabel(workout.workoutType)}
                    </Text>
                    <Text style={styles.workoutDate}>
                      {new Date(workout.startedAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.sourceTag}>
                    <Text style={styles.sourceText}>
                      {getSourceLabel(workout.source)}
                    </Text>
                  </View>
                </View>
                <View style={styles.workoutStats}>
                  {workout.distanceMiles && (
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatValue}>
                        {formatDistance(workout.distanceMiles)}
                      </Text>
                      <Text style={styles.workoutStatLabel}>Distance</Text>
                    </View>
                  )}
                  {workout.elevationGainFt && (
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatValue}>
                        {formatElevation(workout.elevationGainFt)}
                      </Text>
                      <Text style={styles.workoutStatLabel}>Elevation</Text>
                    </View>
                  )}
                  {workout.durationMinutes && (
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatValue}>
                        {formatDuration(workout.durationMinutes)}
                      </Text>
                      <Text style={styles.workoutStatLabel}>Duration</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Log Workout FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowLogModal(true)}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Log Workout Modal */}
      <Modal
        visible={showLogModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLogModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLogModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Workout</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={createWorkout.isPending}>
              <Text style={[styles.modalSave, createWorkout.isPending && styles.modalSaveDisabled]}>
                {createWorkout.isPending ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Workout Type */}
            <Text style={styles.inputLabel}>Workout Type</Text>
            <View style={styles.typeGrid}>
              {WORKOUT_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    workoutType === type.value && styles.typeOptionActive,
                  ]}
                  onPress={() => setWorkoutType(type.value)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={24}
                    color={workoutType === type.value ? '#ffffff' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      workoutType === type.value && styles.typeLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date */}
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color="#64748b" />
              <Text style={styles.dateButtonText}>
                {workoutDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={workoutDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setWorkoutDate(date);
                }}
              />
            )}

            {/* Duration */}
            <Text style={styles.inputLabel}>Duration (minutes) *</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g., 90"
              keyboardType="numeric"
            />

            {/* Distance */}
            <Text style={styles.inputLabel}>Distance (miles)</Text>
            <TextInput
              style={styles.input}
              value={distance}
              onChangeText={setDistance}
              placeholder="e.g., 5.2"
              keyboardType="decimal-pad"
            />

            {/* Elevation */}
            <Text style={styles.inputLabel}>Elevation Gain (feet)</Text>
            <TextInput
              style={styles.input}
              value={elevation}
              onChangeText={setElevation}
              placeholder="e.g., 1200"
              keyboardType="numeric"
            />

            {/* Title */}
            <Text style={styles.inputLabel}>Title (optional)</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Morning hike at Runyon"
            />

            {/* Notes */}
            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it go?"
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  healthBanner: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  healthBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthBannerText: {
    marginLeft: 12,
    flex: 1,
  },
  healthBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  healthBannerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  historySection: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  workoutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
    marginLeft: 12,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  workoutDate: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  sourceTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  workoutStats: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  workoutStat: {
    flex: 1,
  },
  workoutStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  workoutStatLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#64748b',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  modalSaveDisabled: {
    color: '#94a3b8',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    width: '31%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  typeOptionActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  typeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  typeLabelActive: {
    color: '#ffffff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#0f172a',
    marginLeft: 8,
  },
});
