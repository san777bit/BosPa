import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BrutalBox } from './Brutal';
import { fonts, routeColor } from '../theme/theme';

export default function RouteSelector({
  routes,
  selectedRouteId,
  selectedDirId,
  onSelectRoute,
  onSelectDir,
  activeVehiclesCount = 0,
  t,
  theme,
}) {
  const currentRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const directions = currentRoute?.directions || [];
  const currentDir = directions.find((d) => d.id === selectedDirId) || directions[0];

  const handleSwapDirection = () => {
    if (directions.length > 1) {
      const nextDir = directions.find((d) => d.id !== selectedDirId) || directions[0];
      onSelectDir(nextDir.id);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg, borderBottomColor: theme.outline }]}>
      {/* Route Pills (Horizontal Scroll) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.routesScroll}
      >
        {routes.map((route) => {
          const isSelected = route.id === selectedRouteId;
          const typeLabel = route.kind === 'trolleybus' ? t.trolleybus : t.bus;
          return (
            <BrutalBox
              key={route.id}
              theme={theme}
              radius={999}
              offset={3}
              color={isSelected ? theme.action : theme.surface}
              contentStyle={styles.routeChip}
              onPress={() => onSelectRoute(route.id)}
            >
              <View
                style={[
                  styles.routeTypeBadge,
                  { backgroundColor: routeColor(theme, route.kind), borderColor: theme.outline },
                ]}
              >
                <Text style={[styles.routeTypeText, { color: theme.onColor }]}>
                  {route.kind === 'trolleybus' ? t.trolleyShort : t.busShort}
                </Text>
              </View>
              <Text
                style={[
                  styles.routeTitle,
                  { color: isSelected ? theme.onAction : theme.text },
                ]}
              >
                {route.short}
              </Text>
              <Text
                style={[
                  styles.routeSubtitle,
                  { color: isSelected ? theme.onAction : theme.textSecondary },
                ]}
              >
                {typeLabel}
              </Text>
            </BrutalBox>
          );
        })}
      </ScrollView>

      {/* Direction bar with Quick Swap */}
      <View style={styles.directionBar}>
        <View style={styles.directionInfo}>
          <Text style={[styles.directionLabel, { color: theme.textSecondary }]}>{t.directionLabel}</Text>
          <Text style={[styles.directionTitle, { color: theme.text }]} numberOfLines={1}>
            {currentDir?.title || ''}
          </Text>
        </View>

        {directions.length > 1 && (
          <BrutalBox
            theme={theme}
            radius={999}
            offset={2}
            style={styles.swapWrap}
            contentStyle={styles.swapButton}
            onPress={handleSwapDirection}
          >
            <Text style={[styles.swapText, { color: theme.text }]}>{t.swapDirection}</Text>
          </BrutalBox>
        )}

        <BrutalBox theme={theme} radius={999} offset={2} color={theme.live} contentStyle={styles.statsBadge}>
          <View style={[styles.livePulse, { backgroundColor: theme.onColor, borderColor: theme.onColor }]} />
          <Text style={[styles.statsText, { color: theme.onColor }]}>
            {activeVehiclesCount} {t.onLineBadge}
          </Text>
        </BrutalBox>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    borderBottomWidth: 2.5,
  },
  routesScroll: {
    paddingHorizontal: 16,
    paddingTop: 2,
    gap: 6,
  },
  routeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 7,
  },
  routeTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  routeTypeText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 10,
  },
  routeTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
  },
  routeSubtitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  directionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  directionInfo: {
    flex: 1,
    marginRight: 8,
  },
  directionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  directionTitle: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 13,
  },
  swapWrap: {
    marginRight: 8,
  },
  swapButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  swapText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 11,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  statsText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
});
