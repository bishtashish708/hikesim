import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { trainingApi, hikeApi } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

type Step = 'list' | 'country' | 'hike' | 'form';

interface SelectedHike {
  id: string;
  name: string;
  distanceMiles: number;
  elevationGainFt: number;
}

export default function TrainingScreen() {
  const [step, setStep] = useState<Step>('list');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedHike, setSelectedHike] = useState<SelectedHike | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  const { data: plansData, isLoading: plansLoading, refetch } = useQuery({
    queryKey: ['training-plans'],
    queryFn: () => trainingApi.getMyPlans(),
  });

  const { data: hikesData, isLoading: hikesLoading } = useQuery({
    queryKey: ['hikes-for-plan', selectedCountry],
    queryFn: () => hikeApi.getAll({ country: selectedCountry, limit: 100 }),
    enabled: !!selectedCountry && step === 'hike',
  });

  const generatePlanMutation = useMutation({
    mutationFn: (planData: any) => trainingApi.generateQuickPlan(planData),
    onSuccess: () => {
      Alert.alert('Success', 'Training plan created successfully!');
      resetFlow();
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create training plan');
    },
  });

  const plans = plansData?.data || [];
  const hikes = hikesData?.data?.items || hikesData?.data?.hikes || [];

  const filteredHikes = hikes.filter((hike: any) =>
    hike.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetFlow = () => {
    setStep('list');
    setSelectedCountry(null);
    setSelectedHike(null);
    setSearchQuery('');
    setFitnessLevel('beginner');
  };

  const handleGeneratePlan = () => {
    if (!selectedHike) {
      Alert.alert('Error', 'Please select a hike');
      return;
    }

    generatePlanMutation.mutate({
      hikeName: selectedHike.name,
      hikeId: selectedHike.id,
      distanceMiles: selectedHike.distanceMiles,
      elevationGainFt: selectedHike.elevationGainFt,
      fitnessLevel,
      targetDate: new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  };

  // Step 1: Country Selection
  if (step === 'country') {
    return (
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={resetFlow}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Select Country</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.stepContent}>
          <Text style={styles.stepDescription}>
            Choose the country where you want to hike
          </Text>

          <View style={styles.countryOptions}>
            <TouchableOpacity
              style={styles.countryCard}
              onPress={() => {
                setSelectedCountry('US');
                setStep('hike');
              }}
            >
              <Text style={styles.countryFlag}>🇺🇸</Text>
              <Text style={styles.countryName}>United States</Text>
              <Text style={styles.countryCount}>3,200+ hikes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.countryCard}
              onPress={() => {
                setSelectedCountry('IN');
                setStep('hike');
              }}
            >
              <Text style={styles.countryFlag}>🇮🇳</Text>
              <Text style={styles.countryName}>India</Text>
              <Text style={styles.countryCount}>280+ hikes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Step 2: Hike Selection
  if (step === 'hike') {
    return (
      <View style={styles.container}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep('country')}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Select Hike</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search hikes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Country Badge */}
        <View style={styles.selectedBadge}>
          <Text style={styles.selectedBadgeText}>
            {selectedCountry === 'US' ? '🇺🇸 United States' : '🇮🇳 India'}
          </Text>
          <TouchableOpacity onPress={() => setStep('country')}>
            <Text style={styles.changeBadgeText}>Change</Text>
          </TouchableOpacity>
        </View>

        {hikesLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Loading hikes...</Text>
          </View>
        ) : filteredHikes.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="search-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>No hikes found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        ) : (
          <FlatList
            data={filteredHikes}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={styles.hikeList}
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity
                style={styles.hikeCard}
                onPress={() => {
                  setSelectedHike({
                    id: item.id,
                    name: item.name,
                    distanceMiles: item.distanceMiles,
                    elevationGainFt: item.elevationGainFt,
                  });
                  setStep('form');
                }}
              >
                <View style={styles.hikeInfo}>
                  <Text style={styles.hikeName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.hikeLocation}>
                    {item.city || item.parkName || 'Unknown location'}
                  </Text>
                  <View style={styles.hikeStats}>
                    <View style={styles.hikeStat}>
                      <Ionicons name="walk" size={14} color="#64748b" />
                      <Text style={styles.hikeStatText}>{item.distanceMiles?.toFixed(1)} mi</Text>
                    </View>
                    <View style={styles.hikeStat}>
                      <Ionicons name="trending-up" size={14} color="#64748b" />
                      <Text style={styles.hikeStatText}>{item.elevationGainFt} ft</Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  // Step 3: Plan Form
  if (step === 'form') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => setStep('hike')}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Configure Plan</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Selected Hike Card */}
        <View style={styles.selectedHikeCard}>
          <View style={styles.selectedHikeIcon}>
            <Ionicons name="trail-sign" size={24} color="#10b981" />
          </View>
          <View style={styles.selectedHikeInfo}>
            <Text style={styles.selectedHikeName}>{selectedHike?.name}</Text>
            <Text style={styles.selectedHikeStats}>
              {selectedHike?.distanceMiles?.toFixed(1)} mi • {selectedHike?.elevationGainFt} ft gain
            </Text>
          </View>
          <TouchableOpacity onPress={() => setStep('hike')}>
            <Ionicons name="pencil" size={20} color="#10b981" />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Your Fitness Level</Text>
            <Text style={styles.labelHint}>This helps us customize your training intensity</Text>
            <View style={styles.levelButtons}>
              {[
                { key: 'beginner', label: 'Beginner', desc: 'New to hiking' },
                { key: 'intermediate', label: 'Intermediate', desc: 'Some experience' },
                { key: 'advanced', label: 'Advanced', desc: 'Regular hiker' },
              ].map((level) => (
                <TouchableOpacity
                  key={level.key}
                  style={[
                    styles.levelButton,
                    fitnessLevel === level.key && styles.levelButtonActive,
                  ]}
                  onPress={() => setFitnessLevel(level.key as any)}
                >
                  <Text
                    style={[
                      styles.levelButtonText,
                      fitnessLevel === level.key && styles.levelButtonTextActive,
                    ]}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#6366f1" />
            <Text style={styles.infoBoxText}>
              Your 12-week training plan will be generated using AI based on the hike difficulty and your fitness level.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.generateButton,
              generatePlanMutation.isPending && styles.generateButtonDisabled,
            ]}
            onPress={handleGeneratePlan}
            disabled={generatePlanMutation.isPending}
          >
            {generatePlanMutation.isPending ? (
              <>
                <ActivityIndicator color="#ffffff" />
                <Text style={styles.generateButtonText}>Generating...</Text>
              </>
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#ffffff" />
                <Text style={styles.generateButtonText}>Generate Training Plan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Main List View
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Create New Plan Button */}
      <TouchableOpacity
        style={styles.createNewButton}
        onPress={() => setStep('country')}
      >
        <Ionicons name="add-circle" size={24} color="#ffffff" />
        <Text style={styles.createNewButtonText}>Create New Training Plan</Text>
      </TouchableOpacity>

      {/* Training Plans List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Training Plans</Text>

        {plansLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Loading plans...</Text>
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>No training plans yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first plan to start training!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setStep('country')}
            >
              <Text style={styles.emptyButtonText}>Create Plan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          plans.map((plan: any) => (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={styles.planIconContainer}>
                  <Ionicons name="trail-sign" size={28} color="#10b981" />
                </View>
                <View style={styles.planHeaderText}>
                  <Text style={styles.planName}>{plan.hikeName}</Text>
                  <Text style={styles.planMeta}>
                    {plan.durationWeeks} weeks • {plan.fitnessLevel}
                  </Text>
                </View>
              </View>

              <View style={styles.planStats}>
                <View style={styles.planStat}>
                  <Text style={styles.planStatLabel}>Distance</Text>
                  <Text style={styles.planStatValue}>
                    {plan.distanceMiles?.toFixed(1)} mi
                  </Text>
                </View>
                <View style={styles.planStat}>
                  <Text style={styles.planStatLabel}>Elevation</Text>
                  <Text style={styles.planStatValue}>{plan.elevationGainFt} ft</Text>
                </View>
                <View style={styles.planStat}>
                  <Text style={styles.planStatLabel}>Progress</Text>
                  <Text style={styles.planStatValue}>0%</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.viewPlanButton}>
                <Text style={styles.viewPlanButtonText}>View Full Plan</Text>
                <Ionicons name="chevron-forward" size={18} color="#10b981" />
              </TouchableOpacity>
            </View>
          ))
        )}
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
  // Step Header
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  stepContent: {
    padding: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  // Country Selection
  countryOptions: {
    gap: 16,
  },
  countryCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  countryFlag: {
    fontSize: 48,
    marginBottom: 12,
  },
  countryName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  countryCount: {
    fontSize: 14,
    color: '#64748b',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  // Selected Badge
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectedBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#166534',
  },
  changeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  // Hike List
  hikeList: {
    paddingHorizontal: 16,
  },
  hikeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hikeInfo: {
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
    gap: 16,
  },
  hikeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hikeStatText: {
    fontSize: 13,
    color: '#64748b',
  },
  // Selected Hike Card
  selectedHikeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  selectedHikeIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#d1fae5',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedHikeInfo: {
    flex: 1,
  },
  selectedHikeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  selectedHikeStats: {
    fontSize: 14,
    color: '#64748b',
  },
  // Form
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  labelHint: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  levelButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    alignItems: 'center',
  },
  levelButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  levelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  levelButtonTextActive: {
    color: '#ffffff',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: '#4338ca',
    lineHeight: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 18,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Main List
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  createNewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  centerContainer: {
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
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: '#d1fae5',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planHeaderText: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  planMeta: {
    fontSize: 14,
    color: '#64748b',
  },
  planStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  planStat: {
    flex: 1,
    alignItems: 'center',
  },
  planStatLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  planStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  viewPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  viewPlanButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
});
