import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { IconSearch } from '../components/Icons';

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
      <View style={[styles.searchSection, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardSecondary }]}>
          <IconSearch size={16} color={theme.textMuted} />
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
              <Text style={[styles.clearSearch, { color: theme.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: t.filterAll },
            { id: 'trolleybus', label: t.filterTrolley },
            { id: 'bus', label: t.filterBuses },
          ].map((tab) => {
            const isSelected = filterType === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.filterTab,
                  { backgroundColor: isSelected ? theme.primary : theme.cardSecondary },
                ]}
                onPress={() => setFilterType(tab.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Routes List */}
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.listHeader, { color: theme.textSecondary }]}>
          {t.routesFound}: {filteredRoutes.length}
        </Text>

        {filteredRoutes.map((route) => {
          const isTrolley = route.kind === 'trolleybus';
          const dirA = route.directions[0];
          const dirB = route.directions[1];

          return (
            <View
              key={route.id}
              style={[
                styles.routeCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              {/* Card top */}
              <View style={styles.cardTop}>
                <View style={styles.numberBadgeWrap}>
                  <View
                    style={[
                      styles.routeBadge,
                      { backgroundColor: isTrolley ? '#0284C7' : '#059669' },
                    ]}
                  >
                    <Text style={styles.routeNumberText}>{route.short}</Text>
                  </View>
                  <Text style={[styles.kindLabel, { color: theme.textSecondary }]}>
                    {isTrolley ? t.trolleybus : t.bus}
                  </Text>
                </View>

                <View style={styles.cardHeaderInfo}>
                  <Text style={[styles.routeTitle, { color: theme.text }]}>{route.title}</Text>
                  <View style={[styles.verifiedChip, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
                    <Text style={[styles.verifiedChipText, { color: theme.primary }]}>
                      {t.verifiedOsm}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Directions details */}
              <View style={[styles.directionsBlock, { backgroundColor: theme.cardSecondary }]}>
                <View style={styles.directionItem}>
                  <View style={[styles.directionDot, { backgroundColor: theme.primary }]} />
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
                    <View style={[styles.directionDot, { backgroundColor: theme.primary }]} />
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
                <View style={[styles.metaBadge, { backgroundColor: theme.cardSecondary }]}>
                  <Text style={[styles.metaBadgeLabel, { color: theme.textSecondary }]}>{t.scheduleInterval}</Text>
                  <Text style={[styles.metaBadgeValue, { color: theme.text }]}>5–8 {t.minEta}</Text>
                </View>

                <View style={[styles.metaBadge, { backgroundColor: theme.cardSecondary }]}>
                  <Text style={[styles.metaBadgeLabel, { color: theme.textSecondary }]}>{t.scheduleHours}</Text>
                  <Text style={[styles.metaBadgeValue, { color: theme.text }]}>06:00 – 23:00</Text>
                </View>

                <View style={[styles.metaBadge, { backgroundColor: theme.cardSecondary }]}>
                  <Text style={[styles.metaBadgeLabel, { color: theme.textSecondary }]}>{t.onLineCount}</Text>
                  <Text style={[styles.metaBadgeValue, { color: theme.primary }]}>
                    {isTrolley ? '4' : '5'}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.openMapButton, { backgroundColor: theme.primary }]}
                  onPress={() => onSelectRouteAndOpenMap(route.id, dirA.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.openMapButtonText}>{t.openOnMap}</Text>
                  <Text style={styles.openMapArrow}>→</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    outlineStyle: 'none',
  },
  clearSearch: {
    fontSize: 14,
    padding: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  listHeader: {
    fontSize: 13,
    fontWeight: '700',
  },
  routeCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 4px 14px rgba(15,23,42,0.06)',
      },
    }),
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  numberBadgeWrap: {
    alignItems: 'center',
    width: 58,
  },
  routeBadge: {
    width: '100%',
    paddingVertical: 7,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeNumberText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  kindLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 3,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  verifiedChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
  },
  verifiedChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  directionsBlock: {
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  directionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  directionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  dirLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dirValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  dirStopsCount: {
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
    alignItems: 'center',
  },
  metaBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  metaBadgeValue: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
  },
  openMapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  openMapButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  openMapArrow: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
