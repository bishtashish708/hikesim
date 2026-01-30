import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { leaderboardApi, LeaderboardType, TimeFrame, LeaderboardEntry } from '@/services/api';

const LEADERBOARD_TYPES: { id: LeaderboardType; label: string; icon: string; unit: string }[] = [
  { id: 'distance', label: 'Distance', icon: 'walk', unit: 'mi' },
  { id: 'elevation', label: 'Elevation', icon: 'trending-up', unit: 'ft' },
  { id: 'workouts', label: 'Workouts', icon: 'fitness', unit: '' },
  { id: 'streak', label: 'Streaks', icon: 'flame', unit: 'days' },
  { id: 'challenges', label: 'Challenges', icon: 'trophy', unit: '' },
  { id: 'points', label: 'Points', icon: 'star', unit: 'pts' },
];

const TIME_FRAMES: { id: TimeFrame; label: string }[] = [
  { id: 'weekly', label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
  { id: 'allTime', label: 'All Time' },
];

function getRankBadge(rank: number): { color: string; icon: string } | null {
  switch (rank) {
    case 1:
      return { color: '#fbbf24', icon: 'medal' }; // Gold
    case 2:
      return { color: '#9ca3af', icon: 'medal' }; // Silver
    case 3:
      return { color: '#cd7f32', icon: 'medal' }; // Bronze
    default:
      return null;
  }
}

function formatValue(value: number, type: LeaderboardType): string {
  if (type === 'distance') {
    return value.toFixed(1);
  }
  if (type === 'elevation' || type === 'points') {
    return value.toLocaleString();
  }
  return value.toString();
}

export default function LeaderboardScreen() {
  const [selectedType, setSelectedType] = useState<LeaderboardType>('distance');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('weekly');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['leaderboard', selectedType, selectedTimeFrame],
    queryFn: () =>
      leaderboardApi.get({
        type: selectedType,
        timeFrame: selectedTimeFrame,
        limit: 50,
      }),
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const leaderboard = data?.data?.leaderboard || [];
  const currentUserRank = data?.data?.currentUserRank;
  const selectedTypeConfig = LEADERBOARD_TYPES.find((t) => t.id === selectedType);

  const renderLeaderboardItem = (entry: LeaderboardEntry, index: number) => {
    const rankBadge = getRankBadge(entry.rank);
    const isTopThree = entry.rank <= 3;

    return (
      <View
        key={entry.userId}
        style={[
          styles.leaderboardItem,
          entry.isCurrentUser && styles.currentUserItem,
          isTopThree && styles.topThreeItem,
        ]}
      >
        <View style={styles.rankContainer}>
          {rankBadge ? (
            <View style={[styles.rankBadge, { backgroundColor: rankBadge.color }]}>
              <Ionicons name={rankBadge.icon as any} size={16} color="#ffffff" />
            </View>
          ) : (
            <Text style={styles.rankNumber}>{entry.rank}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {entry.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.nameContainer}>
            <Text
              style={[styles.userName, entry.isCurrentUser && styles.currentUserName]}
              numberOfLines={1}
            >
              {entry.userName}
              {entry.isCurrentUser && ' (You)'}
            </Text>
          </View>
        </View>
        <View style={styles.valueContainer}>
          <Text style={[styles.value, entry.isCurrentUser && styles.currentUserValue]}>
            {formatValue(entry.value, selectedType)}
          </Text>
          <Text style={styles.unit}>{selectedTypeConfig?.unit}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>See how you rank against other hikers</Text>
      </View>

      {/* Time Frame Selector */}
      <View style={styles.timeFrameContainer}>
        {TIME_FRAMES.map((tf) => (
          <TouchableOpacity
            key={tf.id}
            style={[
              styles.timeFrameButton,
              selectedTimeFrame === tf.id && styles.activeTimeFrameButton,
            ]}
            onPress={() => setSelectedTimeFrame(tf.id)}
          >
            <Text
              style={[
                styles.timeFrameText,
                selectedTimeFrame === tf.id && styles.activeTimeFrameText,
              ]}
            >
              {tf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Type Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typeScroll}
        contentContainerStyle={styles.typeContainer}
      >
        {LEADERBOARD_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.typeButton,
              selectedType === type.id && styles.activeTypeButton,
            ]}
            onPress={() => setSelectedType(type.id)}
          >
            <Ionicons
              name={type.icon as any}
              size={20}
              color={selectedType === type.id ? '#ffffff' : '#64748b'}
            />
            <Text
              style={[
                styles.typeText,
                selectedType === type.id && styles.activeTypeText,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Leaderboard List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Loading leaderboard...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={styles.errorText}>Failed to load leaderboard</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : leaderboard.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="podium-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyText}>
              Be the first to log a workout and climb the leaderboard!
            </Text>
          </View>
        ) : (
          <>
            {/* Top 3 Podium */}
            <View style={styles.podiumContainer}>
              {leaderboard.slice(0, 3).map((entry, index) => {
                const positions = [1, 0, 2]; // 2nd, 1st, 3rd
                const position = positions[index];
                const podiumHeights = [100, 130, 80];
                const colors = ['#9ca3af', '#fbbf24', '#cd7f32'];

                return (
                  <View
                    key={entry.userId}
                    style={[
                      styles.podiumItem,
                      { order: position },
                    ]}
                  >
                    <View style={[styles.podiumAvatar, { borderColor: colors[index] }]}>
                      <Text style={styles.podiumAvatarText}>
                        {entry.userName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {entry.userName}
                    </Text>
                    <Text style={styles.podiumValue}>
                      {formatValue(entry.value, selectedType)} {selectedTypeConfig?.unit}
                    </Text>
                    <View
                      style={[
                        styles.podiumBase,
                        {
                          height: podiumHeights[index],
                          backgroundColor: colors[index],
                        },
                      ]}
                    >
                      <Text style={styles.podiumRank}>{index + 1}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Rest of the list */}
            <View style={styles.restOfList}>
              {leaderboard.slice(3).map(renderLeaderboardItem)}
            </View>

            {/* Current user rank if not in top 50 */}
            {currentUserRank && (
              <View style={styles.currentUserRankCard}>
                <Text style={styles.currentUserRankLabel}>Your Rank</Text>
                <View style={styles.currentUserRankContent}>
                  <Text style={styles.currentUserRankNumber}>
                    #{currentUserRank.rank}
                  </Text>
                  <Text style={styles.currentUserRankValue}>
                    {formatValue(currentUserRank.value, selectedType)} {selectedTypeConfig?.unit}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  timeFrameContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  timeFrameButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  activeTimeFrameButton: {
    backgroundColor: '#10b981',
  },
  timeFrameText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTimeFrameText: {
    color: '#ffffff',
  },
  typeScroll: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  typeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    gap: 6,
    marginRight: 8,
  },
  activeTypeButton: {
    backgroundColor: '#10b981',
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTypeText: {
    color: '#ffffff',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 100,
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 8,
  },
  podiumAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
    maxWidth: 80,
    textAlign: 'center',
  },
  podiumValue: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  podiumBase: {
    width: '90%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRank: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  restOfList: {
    gap: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  currentUserItem: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
    borderWidth: 2,
  },
  topThreeItem: {
    display: 'none',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748b',
  },
  nameContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  currentUserName: {
    color: '#059669',
    fontWeight: '600',
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  currentUserValue: {
    color: '#059669',
  },
  unit: {
    fontSize: 12,
    color: '#64748b',
  },
  currentUserRankCard: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  currentUserRankLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  currentUserRankContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentUserRankNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  currentUserRankValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
});
