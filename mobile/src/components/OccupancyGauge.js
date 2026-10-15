import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

/**
 * OccupancyGauge: Visual passenger occupancy meter styled after the BosPa reference logo!
 * Features 3 passenger silhouettes and a traffic-light indicator bar.
 */
export default function OccupancyGauge({ level = 0 }) {
  // level: 0 (free), 1 (medium), 2 (full), or null
  const isFree = level === 0;
  const isMedium = level === 1;
  const isFull = level === 2;

  return (
    <View style={styles.container}>
      {/* Top traffic-light occupancy pill */}
      <View style={styles.trafficLightBar}>
        <View style={[styles.lightDot, { backgroundColor: isFree ? '#10B981' : '#E2E8F0', opacity: isFree ? 1 : 0.4 }]} />
        <View style={[styles.lightDot, { backgroundColor: isMedium ? '#F59E0B' : '#E2E8F0', opacity: isMedium ? 1 : 0.4 }]} />
        <View style={[styles.lightDot, { backgroundColor: isFull ? '#EF4444' : '#E2E8F0', opacity: isFull ? 1 : 0.4 }]} />
      </View>

      {/* Stylized windshield with 3 passengers (from the logo!) */}
      <View style={styles.windshield}>
        {/* Passenger 1 */}
        <View style={styles.passenger}>
          <View style={[styles.head, { backgroundColor: level != null && level >= 0 ? '#0F172A' : '#CBD5E1' }]} />
          <View style={[styles.body, { backgroundColor: level != null && level >= 0 ? '#0F172A' : '#CBD5E1' }]} />
        </View>

        {/* Passenger 2 */}
        <View style={styles.passenger}>
          <View style={[styles.head, { backgroundColor: level != null && level >= 1 ? '#0F172A' : '#CBD5E1' }]} />
          <View style={[styles.body, { backgroundColor: level != null && level >= 1 ? '#0F172A' : '#CBD5E1' }]} />
        </View>

        {/* Passenger 3 */}
        <View style={styles.passenger}>
          <View style={[styles.head, { backgroundColor: level != null && level >= 2 ? '#0F172A' : '#CBD5E1' }]} />
          <View style={[styles.body, { backgroundColor: level != null && level >= 2 ? '#0F172A' : '#CBD5E1' }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trafficLightBar: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  lightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  windshield: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
    height: 38,
    paddingHorizontal: 12,
  },
  passenger: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 22,
  },
  head: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 2,
  },
  body: {
    width: 20,
    height: 14,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
});
