import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

const INK = Colors.ink;
const OFF = '#E5E7EB';

/**
 * OccupancyGauge: индикатор загруженности — светофор и три силуэта пассажиров.
 * Цвета берутся из theme.js через colors.js (те же, что у плашек LevelPill).
 */
export default function OccupancyGauge({ level = 0 }) {
  // level: 0 (free), 1 (medium), 2 (full), or null
  const isFree = level === 0;
  const isMedium = level === 1;
  const isFull = level === 2;

  const passengerColor = (min) => (level != null && level >= min ? INK : OFF);

  return (
    <View style={styles.container}>
      {/* Светофор загруженности */}
      <View style={styles.trafficLightBar}>
        <View style={[styles.lightDot, { backgroundColor: isFree ? Colors.levelFree : '#4B5563' }]} />
        <View style={[styles.lightDot, { backgroundColor: isMedium ? Colors.levelMedium : '#4B5563' }]} />
        <View style={[styles.lightDot, { backgroundColor: isFull ? Colors.levelFull : '#4B5563' }]} />
      </View>

      {/* Три пассажира: чем больше закрашено, тем плотнее */}
      <View style={styles.windshield}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.passenger}>
            <View style={[styles.head, { backgroundColor: passengerColor(i) }]} />
            <View style={[styles.body, { backgroundColor: passengerColor(i) }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2.5,
    borderColor: INK,
  },
  trafficLightBar: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: INK,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  lightDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
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
