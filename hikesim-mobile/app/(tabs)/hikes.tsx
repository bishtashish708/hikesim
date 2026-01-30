import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hikeApi } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HikesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const { data: countriesData } = useQuery({
    queryKey: ['countries'],
    queryFn: () => hikeApi.getCountries(),
  });

  const { data: hikesData, isLoading, error } = useQuery({
    queryKey: ['hikes', selectedCountry],
    queryFn: () => hikeApi.getAll({ country: selectedCountry, limit: 500 }),
  });

  const countries = countriesData?.data?.countries || [];
  const hikes = hikesData?.data?.items || hikesData?.data?.hikes || [];

  const filteredHikes = hikes.filter((hike: any) =>
    hike.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHikeCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.hikeCard}
      onPress={() => router.push(`/hike/${item.id}`)}
    >
      <View style={styles.hikeImagePlaceholder}>
        <Ionicons name="image-outline" size={32} color="#94a3b8" />
      </View>
      <View style={styles.hikeDetails}>
        <Text style={styles.hikeName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.hikeLocation}>
          {item.city}, {item.state_name}
        </Text>
        <View style={styles.hikeStats}>
          <View style={styles.statItem}>
            <Ionicons name="walk" size={14} color="#64748b" />
            <Text style={styles.statText}>{item.distanceMiles.toFixed(1)} mi</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={14} color="#64748b" />
            <Text style={styles.statText}>{item.elevationGainFt} ft</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="speedometer" size={14} color="#64748b" />
            <Text style={styles.statText}>{item.difficultyRating}/10</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search hikes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Country Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Country:</Text>
        <FlatList
          horizontal
          data={[{ code: null, name: 'All' }, ...countries]}
          keyExtractor={(item) => item.code || 'all'}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedCountry === item.code && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCountry(item.code)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCountry === item.code && styles.filterChipTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Hikes List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading hikes...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load hikes</Text>
          <Text style={styles.errorSubtext}>Please check your connection</Text>
        </View>
      ) : filteredHikes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No hikes found</Text>
          <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHikes}
          keyExtractor={(item) => item.id}
          renderItem={renderHikeCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 16,
    marginBottom: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  hikeCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  hikeImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hikeDetails: {
    flex: 1,
  },
  hikeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  hikeLocation: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  hikeStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#64748b',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 12,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
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
});
