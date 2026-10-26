import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { IconSearch } from '../components/Icons';
import { BrutalBox, RouteBadge } from '../components/Brutal';
import { fonts } from '../theme/theme';

export default function RoutesListScreen({
  routes = [],
  t,
  theme,
  onSelectRouteAndOpenMap,
}) {
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const matchType = filterType === 'all' || r.kind === filterType;
      const matchQuery =
        !searchQuery.trim() ||
        r.short.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.directions.some((d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchType && matchQuery;
    });
  }, [routes, filterType, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Search Header */}
      <View style={styles.searchSection}>
        <BrutalBox theme={theme} radius={14} offset={3} style={styles.searchWrap} contentStyle={styles.searchBar}>
          <IconSearch size={16} color={theme.text} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t.routesSearchPlaceholder}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearSearch, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          )}
        </BrutalBox>

        {/* Filters */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: t.filterAll },
            { id: 'trolleybus', label: t.filterTrolley },
            { id: 'bus', label: t.filterBuses },
          ].map((tab) => {
            const isSelected = filterType === tab.id;
            return (
              <BrutalBox
                key={tab.id}
                theme={theme}
                radius={999}
                offset={3}
                color={isSelected ? theme.action : theme.surface}
                contentStyle={styles.filterTab}
                onPress={() => setFilterType(tab.id)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    { color: isSelected ? theme.onAction : theme.text },
                  ]}
                >
                  {tab.label}
                </Text>
              </BrutalBox>
            );
          })}
        </View>
      </View>

      {/* Routes List */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.listHeader, { color: theme.text }]}>
          {t.routesFound}: {filteredRoutes.length}
        </Text>

        {filteredRoutes.map((route) => {
          const isTrolley = route.kind === 'trolleybus';
          const dirA = route.directions[0];
          const dirB = route.directions[1];

          return (
            <BrutalBox key={route.id} theme={theme} contentStyle={styles.routeCard}>
              {/* Card top */}
              <View style={styles.cardTop}>
                <View style={styles.numberBadgeWrap}>
                  <RouteBadge route={route} theme={theme} />
                  <Text style={[styles.kindLabel, { color: theme.textSecondary }]}>
                    {isTrolley ? t.trolleybus : t.bus}
                  </Text>
                </View>

                <View style={styles.cardHeaderInfo}>
                  <Text style={[styles.routeTitle, { color: theme.text }]}>{route.title}</Text>
                  <View
                    style={[
                      styles.verifiedChip,
                      {
                        backgroundColor: theme.surfaceAlt,
                        borderColor: theme.line,
                      },
                    ]}
                  >
                    <Text style={[styles.verifiedChipText, { color: theme.textSecondary }]}>
                      {route.verified ? t.verifiedOsm : t.routeUnverified}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Directions details */}
              <View
                style={[
                  styles.directionsBlock,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.line },
                ]}
              >
                <View style={styles.directionItem}>
                  <View style={[styles.directionDot, { backgroundColor: theme.textMuted }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dirLabel, { color: theme.textMuted }]}>{t.directionA}:</Text>
                    <Text style={[styles.dirValue, { color: theme.text }]}>{dirA?.title || ''}</Text>
                    <Text style={[styles.dirStopsCount, { color: theme.textSecondary }]}>
                      {dirA?.stops?.length || 0} {t.stopsCount}
                    </Text>
                  </View>
                </View>

                {dirB && (
                  <View style={styles.directionItem}>
                    <View style={[styles.directionDot, { backgroundColor: theme.textMuted }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dirLabel, { color: theme.textMuted }]}>{t.directionB}:</Text>
                      <Text style={[styles.dirValue, { color: theme.text }]}>{dirB.title}</Text>
                      <Text style={[styles.dirStopsCount, { color: theme.textSecondary }]}>
                        {dirB.stops.length} {t.stopsCount}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Meta information row */}
              <View style={styles.metaInfoRow}>
                <View style={[styles.metaBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.line }]}>
                  <Text style={[styles.metaBadgeLabel, { color: theme.textSecondary }]}>{t.scheduleInterval}</Text>
                  <Text style={[styles.metaBadgeValue, { color: theme.text }]}>5–8 {t.minEta}</Text>
                </View>

                <View style={[styles.metaBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.line }]}>
                  <Text style={[styles.metaBadgeLabel, { color: theme.textSecondary }]}>{t.scheduleHours}</Text>
                  <Text style={[styles.metaBadgeValue, { color: theme.text }]}>06:00 – 23:00</Text>
                </View>

                <View style={[styles.metaBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.line }]}>
                  <Text style={[styles.metaBadgeLabel, { color: theme.textSecondary }]}>{t.onLineCount}</Text>
                  <Text style={[styles.metaBadgeValue, { color: theme.text }]}>
                    {isTrolley ? '4' : '5'}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <BrutalBox
                theme={theme}
                color={theme.action}
                radius={14}
                offset={3}
                contentStyle={styles.openMapButton}
                onPress={() => onSelectRouteAndOpenMap(route.id, dirA.id)}
              >
                <Text style={[styles.openMapButtonText, { color: theme.onAction }]}>{t.openOnMap}</Text>
                <Text style={[styles.openMapArrow, { color: theme.onAction }]}>→</Text>
              </BrutalBox>
            </BrutalBox>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  searchWrap: {
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    outlineStyle: 'none',
  },
  clearSearch: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 14,
    padding: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filterTabText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 13,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 14,
    paddingBottom: 40,
  },
  listHeader: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 13,
  },
  routeCard: {
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  numberBadgeWrap: {
    alignItems: 'center',
    minWidth: 58,
  },
  kindLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    marginTop: 4,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  routeTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    lineHeight: 20,
  },
  verifiedChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 6,
    borderWidth: 2,
  },
  verifiedChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
  directionsBlock: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  directionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  directionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  dirLabel: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  dirValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    marginTop: 1,
  },
  dirStopsCount: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 1,
  },
  metaInfoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metaBadge: {
    flex: 1,
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  metaBadgeLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  metaBadgeValue: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 12,
    marginTop: 2,
  },
  openMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  openMapButtonText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 15,
  },
  openMapArrow: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 16,
  },
});
