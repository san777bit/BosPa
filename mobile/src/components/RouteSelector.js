import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

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
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
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
            <TouchableOpacity
              key={route.id}
              style={[
                styles.routeChip,
                isSelected
                  ? [styles.routeChipSelected, { backgroundColor: theme.primary }]
                  : [styles.routeChipUnselected, { backgroundColor: theme.cardSecondary, borderColor: theme.border }],
              ]}
              onPress={() => onSelectRoute(route.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.routeTypeBadge,
                  isSelected
                    ? styles.routeTypeBadgeSelected
                    : [styles.routeTypeBadgeUnselected, { backgroundColor: theme.border }],
                ]}
              >
                <Text
                  style={[
                    styles.routeTypeText,
                    isSelected ? styles.routeTypeTextSelected : { color: theme.textSecondary },
                  ]}
                >
                  {route.kind === 'trolleybus' ? t.trolleyShort : t.busShort}
                </Text>
              </View>
              <Text
                style={[
                  styles.routeTitle,
                  isSelected ? styles.routeTitleSelected : { color: theme.text },
                ]}
              >
                {route.short}
              </Text>
              <Text
                style={[
                  styles.routeSubtitle,
                  isSelected ? styles.routeSubtitleSelected : { color: theme.textSecondary },
                ]}
              >
                {typeLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Direction bar with Quick Swap */}
      <View style={styles.directionBar}>
        <View style={styles.directionInfo}>
          <Text style={[styles.directionLabel, { color: theme.textMuted }]}>{t.directionLabel}</Text>
          <Text style={[styles.directionTitle, { color: theme.text }]} numberOfLines={1}>
            {currentDir?.title || ''}
          </Text>
        </View>

        {directions.length > 1 && (
          <TouchableOpacity
            style={[styles.swapButton, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}
            onPress={handleSwapDirection}
            activeOpacity={0.7}
          >
            <Text style={[styles.swapText, { color: theme.primary }]}>{t.swapDirection}</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.statsBadge, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
          <View style={[styles.livePulse, { backgroundColor: theme.primary }]} />
          <Text style={[styles.statsText, { color: theme.textSecondary }]}>
            {activeVehiclesCount} {t.onLineBadge}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  routesScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 6,
  },
  routeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 24,
    gap: 7,
  },
  routeChipSelected: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  routeChipUnselected: {
    borderWidth: 1,
  },
  routeTypeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  routeTypeBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  routeTypeBadgeUnselected: {},
  routeTypeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  routeTypeTextSelected: {
    color: '#FFFFFF',
  },
  routeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  routeTitleSelected: {
    color: '#FFFFFF',
  },
  routeSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  routeSubtitleSelected: {
    color: '#D1FAE5',
  },
  directionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  directionInfo: {
    flex: 1,
    marginRight: 8,
  },
  directionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  directionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  swapButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  swapText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statsText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
