import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { trainingApi } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['training-plans'],
    queryFn: () => trainingApi.getMyPlans(),
  });

  const plans = data?.data || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome back!</Text>
        <Text style={styles.welcomeSubtitle}>Ready to train for your next adventure?</Text>
      </View>

      {/* Start Workout Button */}
      <TouchableOpacity
        style={styles.startWorkoutButton}
        onPress={() => router.push('/track-workout')}
      >
        <View style={styles.startWorkoutIcon}>
          <Ionicons name="play" size={28} color="#ffffff" />
        </View>
        <View style={styles.startWorkoutText}>
          <Text style={styles.startWorkoutTitle}>Start Workout</Text>
          <Text style={styles.startWorkoutSubtitle}>Track your hike with GPS</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="fitness" size={24} color="#10b981" />
          <Text style={styles.statNumber}>{plans.length}</Text>
          <Text style={styles.statLabel}>Active Plans</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trail-sign" size={24} color="#6366f1" />
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Hikes Done</Text>
        </View>
      </View>

      {/* Training Plans Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Training Plans</Text>
          <TouchableOpacity onPress={() => router.push('/training')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Loading your plans...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={styles.emptyText}>Failed to load plans</Text>
            <Text style={styles.emptySubtext}>Please check your connection</Text>
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>No training plans yet</Text>
            <Text style={styles.emptySubtext}>Create your first plan to get started!</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/training')}
            >
              <Text style={styles.createButtonText}>Create Plan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {plans.slice(0, 3).map((plan: any) => (
              <TouchableOpacity key={plan.id} style={styles.planCard}>
                <View style={styles.planIconContainer}>
                  <Ionicons name="trail-sign" size={24} color="#10b981" />
                </View>
                <View style={styles.planDetails}>
                  <Text style={styles.planName}>{plan.hikeName}</Text>
                  <Text style={styles.planInfo}>
                    {plan.durationWeeks} weeks • {plan.fitnessLevel}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/hikes')}
          >
            <Ionicons name="search" size={28} color="#10b981" />
            <Text style={styles.actionText}>Browse Hikes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/challenges')}
          >
            <Ionicons name="trophy" size={28} color="#f59e0b" />
            <Text style={styles.actionText}>Challenges</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/training')}
          >
            <Ionicons name="add-circle" size={28} color="#6366f1" />
            <Text style={styles.actionText}>New Plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startWorkoutIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  startWorkoutText: {
    flex: 1,
  },
  startWorkoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  startWorkoutSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
  },
  seeAllText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  createButton: {
    marginTop: 16,
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  planIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#d1fae5',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planDetails: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  planInfo: {
    fontSize: 14,
    color: '#64748b',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 8,
  },
});
