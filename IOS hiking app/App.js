import { StatusBar } from 'expo-status-bar';
import {
  Dimensions,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const heroWidth = Math.min(width - 32, 640);
const hikes = [
  {
    name: "Angel's Landing",
    location: 'Utah, United States',
    distance: '5.4 mi',
    gain: '1,500 ft gain',
    rating: '4.8',
    reviews: '2,141 reviews',
    difficulty: 'Moderate',
  },
  {
    name: 'Cascade Mountain',
    location: 'New York, United States',
    distance: '4.8 mi',
    gain: '2,000 ft gain',
    rating: '4.5',
    reviews: '1,316 reviews',
    difficulty: 'Moderate',
  },
  {
    name: 'Emerald Lake Trail',
    location: 'Colorado, United States',
    distance: '3.6 mi',
    gain: '700 ft gain',
    rating: '4.7',
    reviews: '557 reviews',
    difficulty: 'Easy',
  },
];

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.backgroundTop} />
      <View style={styles.backgroundGlow} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>HIKESIM</Text>
          <Pressable style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Sign in</Text>
          </Pressable>
        </View>

        <View style={[styles.heroCard, { width: heroWidth }]}>
          <Text style={styles.heroEyebrow}>TREADMILL-READY HIKES</Text>
          <Text style={styles.heroTitle}>
            Turn a real hike into a treadmill-ready plan.
          </Text>
          <Text style={styles.heroBody}>
            Pick a hike, set your incline limits, and generate a time-based plan with
            smart warm-up and cool-down built in.
          </Text>
          <View style={styles.heroActions}>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Get started for free</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Preview plan</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>TRENDING HIKES</Text>
              <Text style={styles.sectionTitle}>Trending in United States</Text>
              <Text style={styles.sectionNote}>
                We only use your city/region to recommend nearby hikes.
              </Text>
            </View>
            <Pressable style={styles.locationButton}>
              <Text style={styles.locationButtonText}>Use my location</Text>
            </Pressable>
          </View>

          {hikes.map((hike) => (
            <View key={hike.name} style={styles.hikeCard}>
              <View style={styles.hikeHeader}>
                <View>
                  <Text style={styles.hikeName}>{hike.name}</Text>
                  <Text style={styles.hikeLocation}>{hike.location}</Text>
                </View>
                <View style={styles.hikeRating}>
                  <Text style={styles.hikeRatingValue}>{hike.rating} ★</Text>
                  <Text style={styles.hikeRatingCount}>{hike.reviews}</Text>
                </View>
              </View>
              <View style={styles.hikeMeta}>
                <Text style={styles.hikeMetaText}>{hike.distance}</Text>
                <Text style={styles.hikeMetaText}>{hike.gain}</Text>
                <View style={styles.hikeTag}>
                  <Text style={styles.hikeTagText}>{hike.difficulty}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f7faf7',
  },
  backgroundTop: {
    position: 'absolute',
    top: -240,
    left: -100,
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: '#def7ed',
    opacity: 0.7,
  },
  backgroundGlow: {
    position: 'absolute',
    top: 80,
    right: -120,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#fff3d6',
    opacity: 0.6,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: 960,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 14,
    letterSpacing: 3,
    color: '#1f8f64',
    fontFamily: Platform.select({ ios: 'AvenirNext-DemiBold', android: 'serif' }),
  },
  headerButton: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#d7e3db',
  },
  headerButtonText: {
    color: '#1d3b2f',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'AvenirNext-Medium', android: 'serif' }),
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e3efe6',
    shadowColor: '#0b3d2c',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  heroEyebrow: {
    fontSize: 10,
    letterSpacing: 2.6,
    color: '#2d8b68',
    fontFamily: Platform.select({ ios: 'AvenirNext-Medium', android: 'serif' }),
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 26,
    color: '#0f231b',
    fontFamily: Platform.select({ ios: 'AvenirNext-Bold', android: 'serif' }),
  },
  heroBody: {
    marginTop: 10,
    fontSize: 13,
    color: '#52645b',
    lineHeight: 20,
    fontFamily: Platform.select({ ios: 'AvenirNext-Regular', android: 'serif' }),
  },
  heroActions: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#109f6c',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'AvenirNext-DemiBold', android: 'serif' }),
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#d7e3db',
  },
  secondaryButtonText: {
    color: '#375045',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'AvenirNext-Medium', android: 'serif' }),
  },
  section: {
    width: '100%',
    maxWidth: 960,
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionEyebrow: {
    fontSize: 10,
    letterSpacing: 2.4,
    color: '#2d8b68',
    fontFamily: Platform.select({ ios: 'AvenirNext-Medium', android: 'serif' }),
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 18,
    color: '#10251c',
    fontFamily: Platform.select({ ios: 'AvenirNext-DemiBold', android: 'serif' }),
  },
  sectionNote: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7c74',
    fontFamily: Platform.select({ ios: 'AvenirNext-Regular', android: 'serif' }),
  },
  locationButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d7e3db',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  locationButtonText: {
    fontSize: 11,
    color: '#3a5a4a',
    fontFamily: Platform.select({ ios: 'AvenirNext-Medium', android: 'serif' }),
  },
  hikeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e7efe9',
    shadowColor: '#0b3d2c',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  hikeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  hikeName: {
    fontSize: 15,
    color: '#10251c',
    fontFamily: Platform.select({ ios: 'AvenirNext-DemiBold', android: 'serif' }),
  },
  hikeLocation: {
    marginTop: 4,
    fontSize: 11,
    color: '#6a7a71',
    fontFamily: Platform.select({ ios: 'AvenirNext-Regular', android: 'serif' }),
  },
  hikeRating: {
    alignItems: 'flex-end',
  },
  hikeRatingValue: {
    fontSize: 12,
    color: '#1f8f64',
    fontFamily: Platform.select({ ios: 'AvenirNext-DemiBold', android: 'serif' }),
  },
  hikeRatingCount: {
    marginTop: 2,
    fontSize: 10,
    color: '#7d8d85',
    fontFamily: Platform.select({ ios: 'AvenirNext-Regular', android: 'serif' }),
  },
  hikeMeta: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  hikeMetaText: {
    fontSize: 11,
    color: '#3b4d44',
    fontFamily: Platform.select({ ios: 'AvenirNext-Regular', android: 'serif' }),
  },
  hikeTag: {
    backgroundColor: '#eaf7f0',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  hikeTagText: {
    fontSize: 10,
    color: '#177a55',
    fontFamily: Platform.select({ ios: 'AvenirNext-Medium', android: 'serif' }),
  },
});
