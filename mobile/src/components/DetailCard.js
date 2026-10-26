import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import OccupancyGauge from './OccupancyGauge';
import { BrutalBox, LevelPill } from './Brutal';
import { fonts } from '../theme/theme';

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

  const hints = [t.level0Hint, t.level1Hint, t.level2Hint];
  const levelHint = hints[data.level] || t.levelNoneHint;

  const etaText =
    data.eta_s == null
      ? '—'
      : data.eta_s < 60
      ? t.approaching
      : `${Math.round(data.eta_s / 60)} ${t.minEta}`;

  return (
    <View style={styles.cardContainer}>
      <BrutalBox theme={theme} radius={20} contentStyle={styles.card}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleArea}>
            <View
              style={[
                styles.kindBadge,
                isStop
                  ? { backgroundColor: theme.surfaceAlt, borderColor: theme.line }
                  : { backgroundColor: theme.live, borderColor: theme.outline },
              ]}
            >
              <Text style={[styles.kindBadgeText, { color: isStop ? theme.textSecondary : theme.onColor }]}>
                {isStop ? t.stopLabel : t.vehicleLabel}
              </Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {isStop ? data.name : `${t.vehicleLabel} ${data.ext_id || ''}`}
            </Text>
          </View>
          <BrutalBox
            theme={theme}
            radius={16}
            offset={2}
            color={theme.surfaceAlt}
            contentStyle={styles.closeBtn}
            onPress={onClose}
          >
            <Text style={[styles.closeBtnText, { color: theme.text }]}>✕</Text>
          </BrutalBox>
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
                  {isStop ? etaText : data.speed_kmh != null ? `${Math.round(data.speed_kmh)} ${t.speedUnit}` : '—'}
                </Text>
              </View>
            </View>

            <LevelPill level={data.level} t={t} theme={theme} />

            <Text style={[styles.levelHint, { color: theme.textSecondary }]}>{levelHint}</Text>
          </View>

          <View style={styles.gaugeCol}>
            <OccupancyGauge level={data.level} />
            <Text style={[styles.gaugeCaption, { color: theme.textMuted }]}>{t.brandName}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { borderTopColor: theme.line }]}>
          <Text style={[styles.statsNote, { color: theme.textSecondary }]}>
            {isStop
              ? `${t.basedOnReports}: ${data.count ?? 0}`
              : `${t.ridersInVehicle} ${data.riders ?? 0}`}
          </Text>
        </View>

        {/* Check-in button */}
        <BrutalBox
          theme={theme}
          color={theme.action}
          radius={16}
          offset={3}
          contentStyle={styles.checkinButton}
          onPress={() => onCheckinPress(data, isStop)}
        >
          <Text style={[styles.checkinText, { color: theme.onAction }]}>
            {isStop ? t.checkinButtonStop : t.checkinButtonVehicle}
          </Text>
          <View style={[styles.rewardPill, { backgroundColor: theme.reward, borderColor: theme.outline }]}>
            <Text style={[styles.rewardText, { color: theme.onColor }]}>+10 B</Text>
          </View>
        </BrutalBox>
      </BrutalBox>
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
    padding: 16,
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
    borderRadius: 999,
    borderWidth: 2,
    marginBottom: 6,
  },
  kindBadgeText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 14,
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
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  metricValue: {
    fontFamily: fonts.display,
    fontSize: 18,
    marginTop: 2,
  },
  levelHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  gaugeCol: {
    alignItems: 'center',
    marginLeft: 12,
  },
  gaugeCaption: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    marginTop: 4,
  },
  statsRow: {
    borderTopWidth: 2,
    paddingTop: 8,
    marginBottom: 12,
  },
  statsNote: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  checkinText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 15,
  },
  rewardPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 2,
  },
  rewardText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 11,
  },
});
