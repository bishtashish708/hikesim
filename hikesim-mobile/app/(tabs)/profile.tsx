import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { healthApi, HealthConnection } from '@/services/api';
import { getDeviceHealthPlatform, isNativeHealthAvailable } from '@/services/healthService';

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const devicePlatform = getDeviceHealthPlatform();
  const nativeAvailable = isNativeHealthAvailable();

  // Fetch health connections
  const { data: connectionsData } = useQuery({
    queryKey: ['healthConnections'],
    queryFn: () => healthApi.getConnections(),
  });

  const connections = connectionsData?.data?.connections || [];

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: (platform: string) => healthApi.connect(platform as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthConnections'] });
      Alert.alert('Connected', 'Health platform connected successfully!');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to connect health platform');
    },
    onSettled: () => {
      setConnectingPlatform(null);
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: (platform: string) => healthApi.disconnect(platform as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['healthConnections'] });
      Alert.alert('Disconnected', 'Health platform disconnected');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to disconnect health platform');
    },
  });

  const handleConnectHealth = (platform: string) => {
    const isConnected = connections.find((c: HealthConnection) => c.platform === platform && c.isConnected);

    if (isConnected) {
      Alert.alert(
        'Disconnect',
        `Are you sure you want to disconnect from ${platform === 'APPLE_HEALTH' ? 'Apple Health' : 'Google Fit'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: () => disconnectMutation.mutate(platform),
          },
        ]
      );
    } else {
      setConnectingPlatform(platform);
      connectMutation.mutate(platform);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    color = '#0f172a',
    showChevron = true,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    color?: string;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={20} color="#94a3b8" />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {user.image ? (
            <View style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#64748b" />
            </View>
          )}
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => Alert.alert('Coming Soon', 'Edit profile feature coming soon!')}
        >
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="person-outline"
            title="Personal Information"
            subtitle="Update your details"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            color="#10b981"
          />
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage your notifications"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            color="#6366f1"
          />
          <MenuItem
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            subtitle="Control your privacy settings"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            color="#f59e0b"
          />
        </View>
      </View>

      {/* Activity Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="stats-chart-outline"
            title="Activity History"
            subtitle="View your training history"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            color="#8b5cf6"
          />
          <MenuItem
            icon="trophy-outline"
            title="Achievements"
            subtitle="View your badges and awards"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            color="#f59e0b"
          />
          <MenuItem
            icon="heart-outline"
            title="Saved Hikes"
            subtitle="Your favorite hikes"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            color="#ef4444"
          />
        </View>
      </View>

      {/* Health Connections Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health Connections</Text>
        <View style={styles.menuGroup}>
          {/* Apple Health (iOS only) */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.healthItem}
              onPress={() => handleConnectHealth('APPLE_HEALTH')}
              disabled={connectingPlatform === 'APPLE_HEALTH'}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#ff375f15' }]}>
                <Ionicons name="heart" size={24} color="#ff375f" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Apple Health</Text>
                <Text style={styles.menuSubtitle}>
                  {nativeAvailable
                    ? connections.find((c: HealthConnection) => c.platform === 'APPLE_HEALTH' && c.isConnected)
                      ? 'Connected - Auto-syncing workouts'
                      : 'Tap to connect'
                    : 'Manual logging mode (dev build required for sync)'}
                </Text>
              </View>
              <View
                style={[
                  styles.connectionStatus,
                  connections.find((c: HealthConnection) => c.platform === 'APPLE_HEALTH' && c.isConnected)
                    ? styles.connected
                    : styles.disconnected,
                ]}
              >
                <Text
                  style={[
                    styles.connectionStatusText,
                    connections.find((c: HealthConnection) => c.platform === 'APPLE_HEALTH' && c.isConnected)
                      ? styles.connectedText
                      : styles.disconnectedText,
                  ]}
                >
                  {connectingPlatform === 'APPLE_HEALTH'
                    ? '...'
                    : connections.find((c: HealthConnection) => c.platform === 'APPLE_HEALTH' && c.isConnected)
                    ? 'On'
                    : 'Off'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Google Fit (Android only) */}
          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={styles.healthItem}
              onPress={() => handleConnectHealth('GOOGLE_FIT')}
              disabled={connectingPlatform === 'GOOGLE_FIT'}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#4285f415' }]}>
                <Ionicons name="fitness" size={24} color="#4285f4" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Google Fit</Text>
                <Text style={styles.menuSubtitle}>
                  {nativeAvailable
                    ? connections.find((c: HealthConnection) => c.platform === 'GOOGLE_FIT' && c.isConnected)
                      ? 'Connected - Auto-syncing workouts'
                      : 'Tap to connect'
                    : 'Manual logging mode (dev build required for sync)'}
                </Text>
              </View>
              <View
                style={[
                  styles.connectionStatus,
                  connections.find((c: HealthConnection) => c.platform === 'GOOGLE_FIT' && c.isConnected)
                    ? styles.connected
                    : styles.disconnected,
                ]}
              >
                <Text
                  style={[
                    styles.connectionStatusText,
                    connections.find((c: HealthConnection) => c.platform === 'GOOGLE_FIT' && c.isConnected)
                      ? styles.connectedText
                      : styles.disconnectedText,
                  ]}
                >
                  {connectingPlatform === 'GOOGLE_FIT'
                    ? '...'
                    : connections.find((c: HealthConnection) => c.platform === 'GOOGLE_FIT' && c.isConnected)
                    ? 'On'
                    : 'Off'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Strava - Both platforms */}
          <TouchableOpacity
            style={styles.healthItem}
            onPress={() => Alert.alert('Coming Soon', 'Strava integration coming soon!')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: '#fc4c0215' }]}>
              <Ionicons name="bicycle" size={24} color="#fc4c02" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Strava</Text>
              <Text style={styles.menuSubtitle}>Connect for automatic workout sync</Text>
            </View>
            <View style={[styles.connectionStatus, styles.disconnected]}>
              <Text style={[styles.connectionStatusText, styles.disconnectedText]}>Soon</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="fitness-outline"
            title="Units & Preferences"
            subtitle="Distance, elevation, temperature"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            color="#64748b"
          />
          <MenuItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help or contact us"
            onPress={() => Alert.alert('Coming Soon', 'This feature is coming soon!')}
            color="#0ea5e9"
          />
          <MenuItem
            icon="information-circle-outline"
            title="About HikeSim"
            subtitle="Version 1.0.0"
            onPress={() =>
              Alert.alert(
                'About HikeSim',
                'HikeSim Mobile v1.0.0\n\nYour personal hiking training companion.\n\n© 2026 HikeSim'
              )
            }
            color="#94a3b8"
          />
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Footer */}
      <Text style={styles.footer}>
        Made with ❤️ for hikers worldwide
      </Text>
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
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f1f5f9',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e2e8f0',
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  editProfileButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 24,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  connectionStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connected: {
    backgroundColor: '#dcfce7',
  },
  disconnected: {
    backgroundColor: '#f1f5f9',
  },
  connectionStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectedText: {
    color: '#16a34a',
  },
  disconnectedText: {
    color: '#64748b',
  },
});
