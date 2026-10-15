import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import OccupancyGauge from './OccupancyGauge';

export default function DetailCard({
  selectedItem,
  t,
  theme,
  onClose,
  onCheckinPress,
}) {
  if (!selectedItem) return null;

  const { kind, data } = selectedItem;
  const isStop = kind === 'stop';

  const levelsMap = [
    { badge: t.level0Badge, hint: t.level0Hint, color: '#10B981', bg: theme.isDark ? '#064E3B' : '#D1FAE5' },
    { badge: t.level1Badge, hint: t.level1Hint, color: '#F59E0B', bg: theme.isDark ? '#451A03' : '#FEF3C7' },
    { badge: t.level2Badge, hint: t.level2Hint, color: '#EF4444', bg: theme.isDark ? '#450A0A' : '#FEE2E2' },
  ];

  const levelInfo = levelsMap[data.level] || {
    badge: t.levelNoneBadge,
    hint: t.levelNoneHint,
    color: '#94A3B8',
    bg: theme.cardSecondary,
  };

  const etaText =
    data.eta_s == null
      ? '—'
      : data.eta_s < 60
      ? t.approaching
      : `~${Math.round(data.eta_s / 60)} ${t.minEta}`;

  return (
    <View style={styles.cardContainer}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleArea}>
            <View style={[styles.kindBadge, { backgroundColor: theme.cardSecondary }]}>
              <Text style={[styles.kindBadgeText, { color: theme.textSecondary }]}>
                {isStop ? t.stopLabel : t.vehicleLabel}
              </Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {isStop ? data.name : `${t.vehicleLabel} ${data.ext_id || ''}`}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content row */}
        <View style={styles.contentRow}>
          <View style={styles.infoCol}>
            <View style={styles.metricRow}>
              <View>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  {isStop ? t.arrivingEta : t.currentSpeed}
                </Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {isStop ? etaText : `${data.speed_kmh || 28} ${t.speedUnit}`}
                </Text>
              </View>
            </View>

            <View style={[styles.levelBadge, { backgroundColor: levelInfo.bg }]}>
              <View style={[styles.dotIndicator, { backgroundColor: levelInfo.color }]} />
              <Text style={[styles.levelText, { color: levelInfo.color }]}>
                {levelInfo.badge}
              </Text>
            </View>

            <Text style={[styles.levelHint, { color: theme.textSecondary }]}>{levelInfo.hint}</Text>
          </View>

          <View style={styles.gaugeCol}>
            <OccupancyGauge level={data.level} />
            <Text style={[styles.gaugeCaption, { color: theme.textMuted }]}>{t.brandName}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
          <Text style={[styles.statsNote, { color: theme.textSecondary }]}>
            {isStop
              ? `${t.basedOnReports}: ${data.count || 3}`
              : `${t.ridersInVehicle} ${data.riders || 2}`}
          </Text>
        </View>

        {/* Check-in button */}
        <TouchableOpacity
          style={[styles.checkinButton, { backgroundColor: theme.primary }]}
          onPress={() => onCheckinPress(data, isStop)}
          activeOpacity={0.8}
        >
          <Text style={styles.checkinText}>
            {isStop ? t.checkinButtonStop : t.checkinButtonVehicle}
          </Text>
          <View style={styles.rewardPill}>
            <Text style={styles.rewardText}>+10 B</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  card: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 8px 30px rgba(15,23,42,0.18)',
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  kindBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  kindBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoCol: {
    flex: 1,
    gap: 6,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '800',
  },
  levelHint: {
    fontSize: 11,
    marginTop: 2,
  },
  gaugeCol: {
    alignItems: 'center',
    marginLeft: 12,
  },
  gaugeCaption: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  statsRow: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginBottom: 12,
  },
  statsNote: {
    fontSize: 11,
  },
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkinText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rewardPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
