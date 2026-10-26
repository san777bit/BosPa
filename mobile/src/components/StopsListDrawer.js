import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { BrutalBox, LevelPill } from './Brutal';
import { fonts, statusColor } from '../theme/theme';

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
  const { height: windowHeight } = useWindowDimensions();

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
        <BrutalBox
          theme={theme}
          radius={24}
          offset={5}
          style={[styles.sheetWrap, { maxHeight: windowHeight * 0.8 }]}
          contentStyle={styles.sheet}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTextCol}>
              <Text style={[styles.title, { color: theme.text }]}>{t.stopsListTitle}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {directionTitle} ({stopsWithStatus.length} {t.stopsCount})
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
              <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
            </BrutalBox>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: theme.surfaceAlt, borderColor: theme.line }]}>
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
                <Text style={[styles.clearSearch, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Stops List */}
          <FlatList
            data={filteredStops}
            keyExtractor={(item) => String(item.stop_id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const dotColor = statusColor(theme, item.level);

              const etaText =
                item.eta_s == null
                  ? null
                  : item.eta_s < 60
                  ? t.approaching
                  : `${Math.round(item.eta_s / 60)} ${t.minEta}`;

              return (
                <TouchableOpacity
                  style={[styles.stopItem, { borderBottomColor: theme.line }]}
                  onPress={() => {
                    onSelectStop(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.stopIndexCol}>
                    <View style={[styles.stopDot, { backgroundColor: dotColor, borderColor: theme.outline }]} />
                    <Text style={[styles.stopIndex, { color: theme.textMuted }]}>{index + 1}</Text>
                  </View>

                  <View style={styles.stopNameCol}>
                    <Text style={[styles.stopName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.statusRow}>
                      <LevelPill level={item.level} t={t} theme={theme} small />
                    </View>
                  </View>

                  {etaText ? (
                    <View style={[styles.etaBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.line }]}>
                      <Text style={[styles.etaText, { color: theme.text }]}>{etaText}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.arrowIcon, { color: theme.textMuted }]}>›</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </BrutalBox>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.6)',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  sheetWrap: {
    alignSelf: 'stretch',
  },
  sheet: {
    flexShrink: 1,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTextCol: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 18,
  },
  subtitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2.5,
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
  listContent: {
    paddingHorizontal: 18,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    gap: 12,
  },
  stopIndexCol: {
    alignItems: 'center',
    width: 24,
  },
  stopDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    marginBottom: 2,
  },
  stopIndex: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  stopNameCol: {
    flex: 1,
    gap: 4,
  },
  stopName: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
  },
  etaText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 12,
  },
  arrowIcon: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 20,
  },
});
