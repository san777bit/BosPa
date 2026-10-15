import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';

export default function StopsListDrawer({
  visible,
  directionTitle,
  stopsWithStatus = [],
  t,
  theme,
  onClose,
  onSelectStop,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const levelsMap = [
    { badge: t.level0Badge, color: '#10B981' },
    { badge: t.level1Badge, color: '#F59E0B' },
    { badge: t.level2Badge, color: '#EF4444' },
  ];

  const filteredStops = useMemo(() => {
    if (!searchQuery.trim()) return stopsWithStatus;
    const q = searchQuery.toLowerCase();
    return stopsWithStatus.filter((s) => s.name.toLowerCase().includes(q));
  }, [stopsWithStatus, searchQuery]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={[styles.title, { color: theme.text }]}>{t.stopsListTitle}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {directionTitle} ({stopsWithStatus.length} {t.stopsCount})
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeText, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: theme.cardSecondary }]}>
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={t.searchStopsPlaceholder}
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

          {/* Stops List */}
          <FlatList
            data={filteredStops}
            keyExtractor={(item) => String(item.stop_id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const lvl = levelsMap[item.level] || {
                badge: t.levelNoneBadge,
                color: '#94A3B8',
              };

              const etaText =
                item.eta_s == null
                  ? null
                  : item.eta_s < 60
                  ? t.approaching
                  : `~${Math.round(item.eta_s / 60)} ${t.minEta}`;

              return (
                <TouchableOpacity
                  style={[styles.stopItem, { borderBottomColor: theme.borderLight }]}
                  onPress={() => {
                    onSelectStop(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.stopIndexCol}>
                    <View style={[styles.stopDot, { backgroundColor: lvl.color }]} />
                    <Text style={[styles.stopIndex, { color: theme.textMuted }]}>{index + 1}</Text>
                  </View>

                  <View style={styles.stopNameCol}>
                    <Text style={[styles.stopName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.miniDot, { backgroundColor: lvl.color }]} />
                      <Text style={[styles.statusText, { color: lvl.color }]}>
                        {lvl.badge}
                      </Text>
                    </View>
                  </View>

                  {etaText ? (
                    <View style={[styles.etaBadge, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
                      <Text style={[styles.etaText, { color: theme.primary }]}>{etaText}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.arrowIcon, { color: theme.textMuted }]}>›</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 -4px 25px rgba(0,0,0,0.15)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
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
  listContent: {
    paddingHorizontal: 20,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  stopIndexCol: {
    alignItems: 'center',
    width: 24,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 2,
  },
  stopIndex: {
    fontSize: 10,
    fontWeight: '700',
  },
  stopNameCol: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  etaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  etaText: {
    fontSize: 11,
    fontWeight: '800',
  },
  arrowIcon: {
    fontSize: 18,
    fontWeight: '300',
  },
});
