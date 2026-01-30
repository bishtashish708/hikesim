import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
  FlatList,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hikeApi } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const { width } = Dimensions.get('window');

interface HikeImage {
  url: string;
  source: string;
  caption: string;
  verified: boolean;
}

type TabType = 'overview' | 'images';

export default function HikeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedImage, setSelectedImage] = useState<HikeImage | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['hike', id],
    queryFn: () => hikeApi.getById(id),
    enabled: !!id,
  });

  const hike = data?.data;
  const images: HikeImage[] = hike?.images || [];
  const primaryImageUrl = hike?.primaryImageUrl;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading hike details...</Text>
      </View>
    );
  }

  if (error || !hike) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Failed to load hike</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderImageGallery = () => (
    <View style={styles.galleryContainer}>
      {images.length === 0 ? (
        <View style={styles.noImagesContainer}>
          <Ionicons name="images-outline" size={48} color="#94a3b8" />
          <Text style={styles.noImagesText}>No images available for this trail</Text>
          <Text style={styles.noImagesSubtext}>
            Images are being sourced from trusted hiking websites
          </Text>
        </View>
      ) : (
        <FlatList
          data={images}
          numColumns={2}
          keyExtractor={(item, index) => `${item.url}-${index}`}
          contentContainerStyle={styles.imageGrid}
          columnWrapperStyle={styles.imageRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.imageCard}
              onPress={() => setSelectedImage(item)}
            >
              <Image
                source={{ uri: item.url }}
                style={styles.galleryImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Text style={styles.imageCaption} numberOfLines={2}>
                  {item.caption || 'Trail view'}
                </Text>
                <View style={styles.sourceRow}>
                  <Ionicons name="link" size={12} color="#94a3b8" />
                  <Text style={styles.imageSource}>{item.source}</Text>
                  {item.verified && (
                    <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const renderOverview = () => (
    <>
      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="walk" size={24} color="#10b981" />
          <Text style={styles.statValue}>{hike.distanceMiles.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Miles</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={24} color="#6366f1" />
          <Text style={styles.statValue}>{hike.elevationGainFt}</Text>
          <Text style={styles.statLabel}>Elevation Gain</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="speedometer" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{hike.difficultyRating}/10</Text>
          <Text style={styles.statLabel}>Difficulty</Text>
        </View>
      </View>

      {/* Trail Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trail Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Route Type</Text>
            <Text style={styles.infoValue}>{hike.routeType || 'Loop'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Est. Duration</Text>
            <Text style={styles.infoValue}>
              {Math.round((hike.distanceMiles / 2) * 60)} min
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Max Elevation</Text>
            <Text style={styles.infoValue}>
              {(hike.elevationGainFt + 3000).toLocaleString()} ft
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Trail Surface</Text>
            <Text style={styles.infoValue}>Mixed</Text>
          </View>
        </View>
      </View>

      {/* Elevation Profile */}
      {hike.elevation_profile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Elevation Profile</Text>
          <View style={styles.elevationChart}>
            <Ionicons name="analytics" size={32} color="#94a3b8" />
            <Text style={styles.chartPlaceholder}>
              Interactive elevation chart will appear here
            </Text>
          </View>
        </View>
      )}

      {/* Description */}
      {hike.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Trail</Text>
          <Text style={styles.description}>{hike.description}</Text>
        </View>
      )}

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trail Features</Text>
        <View style={styles.featuresGrid}>
          {[
            { icon: 'water', label: 'Water Sources' },
            { icon: 'camera', label: 'Scenic Views' },
            { icon: 'flower', label: 'Wildlife' },
            { icon: 'warning', label: 'Permits Required' },
          ].map((feature, idx) => (
            <View key={idx} style={styles.featureItem}>
              <Ionicons name={feature.icon as any} size={20} color="#64748b" />
              <Text style={styles.featureLabel}>{feature.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/training',
              params: { hikeId: id, hikeName: hike.name },
            })
          }
        >
          <Ionicons name="flash" size={20} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Generate Training Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton}>
          <Ionicons name="bookmark-outline" size={20} color="#10b981" />
          <Text style={styles.secondaryButtonText}>Save Hike</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Hero Image */}
        {primaryImageUrl ? (
          <TouchableOpacity
            onPress={() =>
              setSelectedImage({
                url: primaryImageUrl,
                source: images[0]?.source || 'Unknown',
                caption: images[0]?.caption || hike.name,
                verified: images[0]?.verified || false,
              })
            }
          >
            <Image
              source={{ uri: primaryImageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay}>
              <View style={styles.imageCountBadge}>
                <Ionicons name="images" size={14} color="#ffffff" />
                <Text style={styles.imageCountText}>{images.length}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="image-outline" size={64} color="#94a3b8" />
          </View>
        )}

        <View style={styles.content}>
          {/* Title Section */}
          <Text style={styles.title}>{hike.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#64748b" />
            <Text style={styles.location}>
              {hike.city}, {hike.state_name || hike.stateCode}
            </Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
              onPress={() => setActiveTab('overview')}
            >
              <Ionicons
                name="information-circle"
                size={20}
                color={activeTab === 'overview' ? '#10b981' : '#64748b'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'overview' && styles.activeTabText,
                ]}
              >
                Overview
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'images' && styles.activeTab]}
              onPress={() => setActiveTab('images')}
            >
              <Ionicons
                name="images"
                size={20}
                color={activeTab === 'images' ? '#10b981' : '#64748b'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'images' && styles.activeTabText,
                ]}
              >
                Photos ({images.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'overview' ? renderOverview() : renderImageGallery()}
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
          {selectedImage && (
            <View style={styles.modalContent}>
              <Image
                source={{ uri: selectedImage.url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.modalCaption}>
                <Text style={styles.modalCaptionText}>
                  {selectedImage.caption || 'Trail view'}
                </Text>
                <View style={styles.modalSourceRow}>
                  <Ionicons name="link" size={14} color="#94a3b8" />
                  <Text style={styles.modalSourceText}>
                    Source: {selectedImage.source}
                  </Text>
                  {selectedImage.verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
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
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  heroImage: {
    width: width,
    height: 240,
  },
  heroPlaceholder: {
    width: width,
    height: 240,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  imageCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  imageCountText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  location: {
    fontSize: 16,
    color: '#64748b',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabText: {
    color: '#10b981',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 20,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flex: 0,
    minWidth: '47%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  elevationChart: {
    height: 160,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chartPlaceholder: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#475569',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureItem: {
    flex: 0,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  featureLabel: {
    fontSize: 14,
    color: '#0f172a',
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  // Gallery styles
  galleryContainer: {
    minHeight: 300,
  },
  noImagesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noImagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  noImagesSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  imageGrid: {
    paddingBottom: 32,
  },
  imageRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  imageCard: {
    width: (width - 44) / 2,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  galleryImage: {
    width: '100%',
    height: 140,
  },
  imageOverlay: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#e2e8f0',
  },
  imageCaption: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 4,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageSource: {
    fontSize: 11,
    color: '#94a3b8',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
  },
  modalImage: {
    width: width,
    height: width * 0.75,
  },
  modalCaption: {
    padding: 20,
    width: '100%',
  },
  modalCaptionText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
  modalSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalSourceText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10b981',
  },
});
