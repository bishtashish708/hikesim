import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { challengeApi, VirtualChallenge, ChallengeProgress, ChallengeDifficulty, StreakMode } from '@/services/api';

const DIFFICULTY_COLORS = {
  EASY: '#22c55e',
  MODERATE: '#f59e0b',
  HARD: '#ef4444',
  EXTREME: '#7c3aed',
};

const DIFFICULTY_LABELS = {
  EASY: 'Easy',
  MODERATE: 'Moderate',
  HARD: 'Hard',
  EXTREME: 'Extreme',
};

const STREAK_MODE_LABELS = {
  STRICT: 'Strict',
  GRACE_PERIOD: 'Grace Period',
  FLEXIBLE: 'Flexible',
};

const STREAK_MODE_ICONS = {
  STRICT: 'alert-circle',
  GRACE_PERIOD: 'time',
  FLEXIBLE: 'infinite',
};

const RARITY_COLORS = {
  common: '#64748b',
  rare: '#3b82f6',
  epic: '#8b5cf6',
  legendary: '#f59e0b',
};

export default function ChallengesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'browse' | 'completed'>('active');
  const [difficultyFilter, setDifficultyFilter] = useState<ChallengeDifficulty | null>(null);
  const [streakModeFilter, setStreakModeFilter] = useState<StreakMode | null>(null);

  // Fetch user's challenge progress
  const { data: progressData, refetch: refetchProgress } = useQuery({
    queryKey: ['myProgress'],
    queryFn: () => challengeApi.getMyProgress('all'),
  });

  // Build filter params
  const filterParams: { difficulty?: ChallengeDifficulty; streakMode?: StreakMode } = {};
  if (difficultyFilter) filterParams.difficulty = difficultyFilter;
  if (streakModeFilter) filterParams.streakMode = streakModeFilter;

  // Fetch all available challenges with filters
  const { data: challengesData, refetch: refetchChallenges } = useQuery({
    queryKey: ['challenges', difficultyFilter, streakModeFilter],
    queryFn: () => challengeApi.getAll(Object.keys(filterParams).length > 0 ? filterParams : undefined),
  });

  const myProgress = progressData?.data?.progress || [];
  const myBadges = progressData?.data?.badges || [];
  const stats = progressData?.data?.stats || {
    activeChallenges: 0,
    completedChallenges: 0,
    totalPoints: 0,
    totalBadges: 0,
    longestStreak: 0,
  };

  const allChallenges = challengesData?.data?.challenges || [];
  const activeChallenges = myProgress.filter((p: ChallengeProgress) => p.status === 'ACTIVE');
  const completedChallenges = myProgress.filter((p: ChallengeProgress) => p.status === 'COMPLETED');

  // Filter out challenges user has already joined for browse tab
  const joinedIds = new Set(myProgress.map((p: ChallengeProgress) => p.challengeId));
  const availableChallenges = allChallenges.filter((c: VirtualChallenge) => !joinedIds.has(c.id));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProgress(), refetchChallenges()]);
    setRefreshing(false);
  }, [refetchProgress, refetchChallenges]);

  const navigateToChallenge = (challengeId: string) => {
    router.push(`/challenge/${challengeId}`);
  };

  const renderProgressCard = (progress: ChallengeProgress) => (
    <TouchableOpacity
      key={progress.id}
      style={styles.progressCard}
      onPress={() => navigateToChallenge(progress.challengeId)}
    >
      {progress.challengeImageUrl && (
        <Image source={{ uri: progress.challengeImageUrl }} style={styles.cardImage} />
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{progress.challengeName}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[progress.challengeDifficulty] }]}>
            <Text style={styles.difficultyText}>{DIFFICULTY_LABELS[progress.challengeDifficulty]}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${Math.min(100, progress.progressPercent)}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.distanceCompleted.toFixed(1)} / {progress.totalDistanceMiles} mi
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={16} color="#f59e0b" />
            <Text style={styles.statText}>{progress.currentStreak} day streak</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="star" size={16} color="#8b5cf6" />
            <Text style={styles.statText}>{progress.pointsEarned} pts</Text>
          </View>
          {progress.streakMultiplier > 1 && (
            <View style={styles.multiplierBadge}>
              <Text style={styles.multiplierText}>{progress.streakMultiplier}x</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderChallengeCard = (challenge: VirtualChallenge) => (
    <TouchableOpacity
      key={challenge.id}
      style={styles.challengeCard}
      onPress={() => navigateToChallenge(challenge.id)}
    >
      {challenge.imageUrl && (
        <Image source={{ uri: challenge.imageUrl }} style={styles.cardImage} />
      )}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{challenge.name}</Text>
          {challenge.isFeatured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#ffffff" />
            </View>
          )}
        </View>

        <Text style={styles.cardDescription} numberOfLines={2}>
          {challenge.description}
        </Text>

        <View style={styles.challengeStats}>
          <View style={styles.challengeStat}>
            <Ionicons name="navigate" size={14} color="#64748b" />
            <Text style={styles.challengeStatText}>{challenge.totalDistanceMiles} mi</Text>
          </View>
          {challenge.totalElevationGainFt && (
            <View style={styles.challengeStat}>
              <Ionicons name="trending-up" size={14} color="#64748b" />
              <Text style={styles.challengeStatText}>{challenge.totalElevationGainFt} ft</Text>
            </View>
          )}
          <View style={styles.challengeStat}>
            <Ionicons name="calendar" size={14} color="#64748b" />
            <Text style={styles.challengeStatText}>~{challenge.estimatedDays} days</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerBadges}>
            <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[challenge.difficulty] }]}>
              <Text style={styles.difficultyText}>{DIFFICULTY_LABELS[challenge.difficulty]}</Text>
            </View>
            <View style={styles.modeBadge}>
              <Ionicons
                name={STREAK_MODE_ICONS[challenge.streakMode] as any}
                size={12}
                color="#64748b"
              />
              <Text style={styles.modeBadgeText}>{STREAK_MODE_LABELS[challenge.streakMode]}</Text>
            </View>
          </View>
          <View style={styles.participantsInfo}>
            <Ionicons name="people" size={14} color="#64748b" />
            <Text style={styles.participantsText}>{challenge.participantCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCompletedCard = (progress: ChallengeProgress) => (
    <TouchableOpacity
      key={progress.id}
      style={[styles.progressCard, styles.completedCard]}
      onPress={() => navigateToChallenge(progress.challengeId)}
    >
      <View style={styles.completedBadge}>
        <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>{progress.challengeName}</Text>
        <View style={styles.completedStats}>
          <Text style={styles.completedStatText}>
            {progress.distanceCompleted.toFixed(1)} mi completed
          </Text>
          <Text style={styles.completedStatText}>
            {progress.pointsEarned} points earned
          </Text>
          {progress.completionBadge && (
            <View style={styles.earnedBadge}>
              <Ionicons
                name={(progress.completionBadge.iconName as any) || 'ribbon'}
                size={16}
                color={RARITY_COLORS[progress.completionBadge.rarity as keyof typeof RARITY_COLORS] || '#64748b'}
              />
              <Text style={styles.earnedBadgeText}>{progress.completionBadge.name}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalPoints}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.completedChallenges}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.longestStreak}</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalBadges}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active ({activeChallenges.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'browse' && styles.activeTab]}
          onPress={() => setActiveTab('browse')}
        >
          <Text style={[styles.tabText, activeTab === 'browse' && styles.activeTabText]}>
            Browse
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed ({completedChallenges.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'active' && (
          <View style={styles.section}>
            {activeChallenges.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="flag-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Active Challenges</Text>
                <Text style={styles.emptyText}>
                  Join a challenge to start tracking your progress!
                </Text>
                <TouchableOpacity
                  style={styles.browseButton}
                  onPress={() => setActiveTab('browse')}
                >
                  <Text style={styles.browseButtonText}>Browse Challenges</Text>
                </TouchableOpacity>
              </View>
            ) : (
              activeChallenges.map(renderProgressCard)
            )}
          </View>
        )}

        {activeTab === 'browse' && (
          <View style={styles.section}>
            {/* Filters */}
            <View style={styles.filtersContainer}>
              <Text style={styles.filterLabel}>Difficulty:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, !difficultyFilter && styles.filterChipActive]}
                  onPress={() => setDifficultyFilter(null)}
                >
                  <Text style={[styles.filterChipText, !difficultyFilter && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                {(['EASY', 'MODERATE', 'HARD', 'EXTREME'] as ChallengeDifficulty[]).map((diff) => (
                  <TouchableOpacity
                    key={diff}
                    style={[
                      styles.filterChip,
                      difficultyFilter === diff && styles.filterChipActive,
                      difficultyFilter === diff && { backgroundColor: DIFFICULTY_COLORS[diff] },
                    ]}
                    onPress={() => setDifficultyFilter(difficultyFilter === diff ? null : diff)}
                  >
                    <Text style={[styles.filterChipText, difficultyFilter === diff && styles.filterChipTextActive]}>
                      {DIFFICULTY_LABELS[diff]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filtersContainer}>
              <Text style={styles.filterLabel}>Mode:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[styles.filterChip, !streakModeFilter && styles.filterChipActive]}
                  onPress={() => setStreakModeFilter(null)}
                >
                  <Text style={[styles.filterChipText, !streakModeFilter && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                {(['FLEXIBLE', 'GRACE_PERIOD', 'STRICT'] as StreakMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.filterChip, streakModeFilter === mode && styles.filterChipActive]}
                    onPress={() => setStreakModeFilter(streakModeFilter === mode ? null : mode)}
                  >
                    <Ionicons
                      name={STREAK_MODE_ICONS[mode] as any}
                      size={14}
                      color={streakModeFilter === mode ? '#ffffff' : '#64748b'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.filterChipText, streakModeFilter === mode && styles.filterChipTextActive]}>
                      {STREAK_MODE_LABELS[mode]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {availableChallenges.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="trophy-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>
                  {difficultyFilter || streakModeFilter ? 'No Matching Challenges' : "You've Joined All Challenges!"}
                </Text>
                <Text style={styles.emptyText}>
                  {difficultyFilter || streakModeFilter
                    ? 'Try adjusting your filters.'
                    : 'Check back later for new challenges.'}
                </Text>
                {(difficultyFilter || streakModeFilter) && (
                  <TouchableOpacity
                    style={styles.browseButton}
                    onPress={() => {
                      setDifficultyFilter(null);
                      setStreakModeFilter(null);
                    }}
                  >
                    <Text style={styles.browseButtonText}>Clear Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              availableChallenges.map(renderChallengeCard)
            )}
          </View>
        )}

        {activeTab === 'completed' && (
          <View style={styles.section}>
            {completedChallenges.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="ribbon-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No Completed Challenges Yet</Text>
                <Text style={styles.emptyText}>
                  Complete a challenge to earn badges and rewards!
                </Text>
              </View>
            ) : (
              completedChallenges.map(renderCompletedCard)
            )}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#10b981',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabText: {
    color: '#10b981',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  challengeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#e2e8f0',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  featuredBadge: {
    backgroundColor: '#f59e0b',
    padding: 4,
    borderRadius: 4,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#64748b',
  },
  multiplierBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  multiplierText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  challengeStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  challengeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  challengeStatText: {
    fontSize: 13,
    color: '#64748b',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsText: {
    fontSize: 13,
    color: '#64748b',
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadge: {
    padding: 16,
  },
  completedStats: {
    gap: 4,
  },
  completedStatText: {
    fontSize: 13,
    color: '#64748b',
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  earnedBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
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
  browseButton: {
    marginTop: 16,
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomPadding: {
    height: 20,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
    marginRight: 8,
    width: 60,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterChipText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  footerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modeBadgeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
});
