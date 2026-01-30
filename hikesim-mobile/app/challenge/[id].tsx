import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { challengeApi, Milestone } from '@/services/api';

const DIFFICULTY_COLORS = {
  EASY: '#22c55e',
  MODERATE: '#f59e0b',
  HARD: '#ef4444',
  EXTREME: '#7c3aed',
};

const STREAK_MODE_INFO = {
  STRICT: { label: 'Strict', description: 'Miss a day and the challenge fails' },
  GRACE_PERIOD: { label: 'Grace Period', description: '1 rest day allowed per week' },
  FLEXIBLE: { label: 'Flexible', description: 'Complete at your own pace' },
};

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showLogModal, setShowLogModal] = useState(false);
  const [logDistance, setLogDistance] = useState('');
  const [logElevation, setLogElevation] = useState('');

  // Fetch challenge details
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['challenge', id],
    queryFn: () => challengeApi.getById(id as string),
    enabled: !!id,
  });

  const challenge = data?.data?.challenge;
  const userProgress = data?.data?.userProgress;
  const leaderboard = data?.data?.leaderboard || [];

  // Join challenge mutation
  const joinMutation = useMutation({
    mutationFn: () => challengeApi.join(id as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenge', id] });
      queryClient.invalidateQueries({ queryKey: ['myProgress'] });
      Alert.alert('Success', 'You\'ve joined the challenge!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to join challenge');
    },
  });

  // Log progress mutation
  const logProgressMutation = useMutation({
    mutationFn: (data: { distanceMiles: number; elevationFt?: number }) =>
      challengeApi.logProgress(id as string, data),
    onSuccess: (response) => {
      const result = response.data;
      setShowLogModal(false);
      setLogDistance('');
      setLogElevation('');
      queryClient.invalidateQueries({ queryKey: ['challenge', id] });
      queryClient.invalidateQueries({ queryKey: ['myProgress'] });

      // Show results
      let message = `+${result.session.sessionPoints} points!`;
      if (result.session.streakBonus > 0) {
        message += `\nStreak bonus: +${result.session.streakBonus}`;
      }
      if (result.milestonesReached.length > 0) {
        message += `\n\nMilestone reached: ${result.milestonesReached[0].name}!`;
      }
      if (result.isCompleted) {
        message = `Congratulations! You completed the challenge!\n\n+${result.session.sessionPoints} points`;
        if (result.badge) {
          message += `\n\nYou earned: ${result.badge.name}`;
        }
      }

      Alert.alert(result.isCompleted ? 'Challenge Complete!' : 'Progress Logged!', message);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to log progress');
    },
  });

  const handleLogProgress = () => {
    const distance = parseFloat(logDistance);
    if (!distance || distance <= 0) {
      Alert.alert('Error', 'Please enter a valid distance');
      return;
    }

    const elevation = logElevation ? parseFloat(logElevation) : undefined;
    logProgressMutation.mutate({ distanceMiles: distance, elevationFt: elevation });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (error || !challenge) {
    return (
      <View style={styles.errorContainer}>
        <Text>Challenge not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const milestones = (challenge.milestones as Milestone[]) || [];
  const milestonesReached = (userProgress?.milestonesReached as number[]) || [];

  return (
    <>
      <Stack.Screen
        options={{
          title: challenge.name,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView style={styles.container}>
        {/* Hero Image */}
        {challenge.imageUrl && (
          <Image source={{ uri: challenge.imageUrl }} style={styles.heroImage} />
        )}

        {/* Challenge Info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{challenge.name}</Text>
          <Text style={styles.description}>{challenge.description}</Text>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{challenge.totalDistanceMiles}</Text>
              <Text style={styles.statLabel}>Miles</Text>
            </View>
            {challenge.totalElevationGainFt && (
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{challenge.totalElevationGainFt.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Ft Elevation</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <Text style={styles.statValue}>~{challenge.estimatedDays}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{challenge.participantCount}</Text>
              <Text style={styles.statLabel}>Participants</Text>
            </View>
          </View>

          {/* Difficulty & Mode */}
          <View style={styles.tagsRow}>
            <View style={[styles.difficultyTag, { backgroundColor: DIFFICULTY_COLORS[challenge.difficulty as keyof typeof DIFFICULTY_COLORS] }]}>
              <Text style={styles.tagText}>{challenge.difficulty}</Text>
            </View>
            <View style={styles.modeTag}>
              <Ionicons name="time-outline" size={14} color="#64748b" />
              <Text style={styles.modeText}>{STREAK_MODE_INFO[challenge.streakMode as keyof typeof STREAK_MODE_INFO]?.label}</Text>
            </View>
          </View>

          <Text style={styles.modeDescription}>
            {STREAK_MODE_INFO[challenge.streakMode as keyof typeof STREAK_MODE_INFO]?.description}
          </Text>
        </View>

        {/* User Progress (if joined) */}
        {userProgress && (
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Your Progress</Text>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, (userProgress.distanceCompleted / challenge.totalDistanceMiles) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {userProgress.distanceCompleted.toFixed(1)} / {challenge.totalDistanceMiles} miles (
                {Math.round((userProgress.distanceCompleted / challenge.totalDistanceMiles) * 100)}%)
              </Text>
            </View>

            {/* Progress Stats */}
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Ionicons name="flame" size={20} color="#f59e0b" />
                <Text style={styles.progressStatValue}>{userProgress.currentStreak}</Text>
                <Text style={styles.progressStatLabel}>Day Streak</Text>
              </View>
              <View style={styles.progressStat}>
                <Ionicons name="star" size={20} color="#8b5cf6" />
                <Text style={styles.progressStatValue}>{userProgress.pointsEarned}</Text>
                <Text style={styles.progressStatLabel}>Points</Text>
              </View>
              <View style={styles.progressStat}>
                <Ionicons name="trending-up" size={20} color="#10b981" />
                <Text style={styles.progressStatValue}>{userProgress.streakMultiplier}x</Text>
                <Text style={styles.progressStatLabel}>Multiplier</Text>
              </View>
            </View>

            {/* Log Progress Button */}
            {userProgress.status === 'ACTIVE' && (
              <TouchableOpacity
                style={styles.logButton}
                onPress={() => setShowLogModal(true)}
              >
                <Ionicons name="add-circle" size={20} color="#ffffff" />
                <Text style={styles.logButtonText}>Log Today's Progress</Text>
              </TouchableOpacity>
            )}

            {userProgress.status === 'COMPLETED' && (
              <View style={styles.completedBanner}>
                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                <Text style={styles.completedText}>Challenge Completed!</Text>
              </View>
            )}
          </View>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <View style={styles.milestonesSection}>
            <Text style={styles.sectionTitle}>Milestones</Text>
            {milestones.map((milestone, index) => {
              const isReached = milestonesReached.includes(index);
              const progress = userProgress
                ? Math.min(100, (userProgress.distanceCompleted / milestone.distanceMiles) * 100)
                : 0;

              return (
                <View key={index} style={styles.milestoneItem}>
                  <View style={[styles.milestoneIcon, isReached && styles.milestoneReached]}>
                    <Ionicons
                      name={isReached ? 'checkmark' : 'flag'}
                      size={16}
                      color={isReached ? '#ffffff' : '#64748b'}
                    />
                  </View>
                  <View style={styles.milestoneContent}>
                    <Text style={styles.milestoneName}>{milestone.name}</Text>
                    <Text style={styles.milestoneDistance}>{milestone.distanceMiles} miles</Text>
                    {userProgress && !isReached && (
                      <View style={styles.milestoneProgressBar}>
                        <View style={[styles.milestoneProgressFill, { width: `${progress}%` }]} />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.leaderboardSection}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
            {leaderboard.slice(0, 5).map((entry: any, index: number) => (
              <View key={entry.rank} style={styles.leaderboardItem}>
                <Text style={styles.leaderboardRank}>#{entry.rank}</Text>
                <Text style={styles.leaderboardName}>{entry.userName}</Text>
                <Text style={styles.leaderboardProgress}>
                  {entry.distanceCompleted.toFixed(1)} mi
                </Text>
                {entry.status === 'COMPLETED' && (
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                )}
              </View>
            ))}
          </View>
        )}

        {/* Join Button (if not joined) */}
        {!userProgress && (
          <View style={styles.joinSection}>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
            >
              <Ionicons name="flag" size={20} color="#ffffff" />
              <Text style={styles.joinButtonText}>
                {joinMutation.isPending ? 'Joining...' : 'Join Challenge'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Log Progress Modal */}
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
            <Text style={styles.modalTitle}>Log Progress</Text>
            <TouchableOpacity
              onPress={handleLogProgress}
              disabled={logProgressMutation.isPending}
            >
              <Text style={[styles.modalSave, logProgressMutation.isPending && styles.modalSaveDisabled]}>
                {logProgressMutation.isPending ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Distance (miles) *</Text>
            <TextInput
              style={styles.input}
              value={logDistance}
              onChangeText={setLogDistance}
              placeholder="e.g., 3.5"
              keyboardType="decimal-pad"
              autoFocus
            />

            <Text style={styles.inputLabel}>Elevation Gain (feet) - Optional</Text>
            <TextInput
              style={styles.input}
              value={logElevation}
              onChangeText={setLogElevation}
              placeholder="e.g., 500"
              keyboardType="numeric"
            />

            <View style={styles.tipBox}>
              <Ionicons name="bulb" size={20} color="#f59e0b" />
              <Text style={styles.tipText}>
                Log your hiking, walking, or any cardio distance that counts toward this challenge.
                Keep your streak going for bonus points!
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLink: {
    color: '#10b981',
    marginTop: 16,
    fontSize: 16,
  },
  heroImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e2e8f0',
  },
  infoSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  difficultyTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  modeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modeText: {
    fontSize: 12,
    color: '#64748b',
  },
  modeDescription: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  progressSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16a34a',
  },
  milestonesSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 8,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  milestoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  milestoneReached: {
    backgroundColor: '#22c55e',
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  milestoneDistance: {
    fontSize: 13,
    color: '#64748b',
  },
  milestoneProgressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  leaderboardSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  leaderboardRank: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    width: 36,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  leaderboardProgress: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
    marginRight: 8,
  },
  joinSection: {
    padding: 20,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomPadding: {
    height: 40,
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
    padding: 20,
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
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
});
