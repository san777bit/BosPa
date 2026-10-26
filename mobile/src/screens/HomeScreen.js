import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { BrutalBox, RouteBadge, LevelPill } from '../components/Brutal';
import { fonts } from '../theme/theme';
import { Api } from '../services/api';
import { getCurrentLocation } from '../services/location';
import { findNearbyStop } from '../services/nearby';

const REFRESH_MS = 15000;

function formatDistance(m, t) {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} ${t.metersUnit}`;
  return `${(m / 1000).toFixed(1)} ${t.kmUnit}`;
}

// Сначала то, что приедет раньше; без ETA — в конце
function byEta(a, b) {
  if (a.eta_s == null) return b.eta_s == null ? 0 : 1;
  if (b.eta_s == null) return -1;
  return a.eta_s - b.eta_s;
}

function DashedDivider({ theme }) {
  // Пунктир только с одной стороны в RN рисуется не везде — поэтому рамка у вью нулевой высоты
  return <View style={[styles.dashed, { borderColor: theme.line }]} />;
}

function ArrivalRow({ row, t, theme, onPress }) {
  const minutes = row.eta_s == null ? null : Math.max(1, Math.round(row.eta_s / 60));
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.arrivalRow, pressed && { backgroundColor: theme.surfaceAlt }]}
    >
      <RouteBadge route={row.route} theme={theme} />
      <View style={styles.arrivalMain}>
        <Text style={[styles.arrivalDir, { color: theme.text }]} numberOfLines={1}>
          {row.direction.title}
        </Text>
        <LevelPill level={row.level} t={t} theme={theme} />
      </View>
      <View style={styles.etaCol}>
        <Text style={[styles.etaValue, { color: theme.text }]}>{minutes ?? '—'}</Text>
        {minutes != null && <Text style={[styles.etaUnit, { color: theme.text }]}>{t.minEta}</Text>}
      </View>
    </Pressable>
  );
}

export default function HomeScreen({
  routes = [],
  t,
  theme,
  onNavigateToRoutes,
  onNavigateToMap,
  onNavigateToShop,
  onSelectRouteAndOpenMap,
}) {
  // undefined — геопозицию ещё спрашиваем, null — её нет
  const [location, setLocation] = useState(undefined);
  const [arrivals, setArrivals] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentLocation().then((loc) => {
      if (!cancelled) setLocation(loc);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const nearby = useMemo(
    () => (location === undefined ? null : findNearbyStop(routes, location)),
    [routes, location],
  );

  useEffect(() => {
    if (!nearby) return undefined;
    let cancelled = false;

    const load = async () => {
      const directions = new Map(nearby.entries.map((e) => [e.direction, e.route]));
      let results;
      try {
        results = await Promise.all(
          [...directions].map(([direction, route]) => Api.getStopsStatus(direction, route.id)),
        );
      } catch (e) {
        return; // нет сети — оставляем прошлые данные
      }
      if (cancelled) return;
      const byDirection = new Map([...directions.keys()].map((d, i) => [d, results[i]]));
      const rows = nearby.entries.map((e) => {
        const st = byDirection.get(e.direction).find((s) => s.stop_id === e.stop.id);
        return { ...e, level: st ? st.level : null, eta_s: st ? st.eta_s : null };
      });
      setArrivals(rows.sort(byEta));
    };

    setArrivals(null);
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [nearby]);

  const caption = !nearby
    ? t.nearbyStop
    : nearby.distanceM != null
      ? `${t.nearbyStop} · ${formatDistance(nearby.distanceM, t)}`
      : t.stopLabel;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.caption, { color: theme.text }]}>{caption}</Text>
      <Text style={[styles.stopTitle, { color: theme.text }]}>{nearby ? nearby.name : '…'}</Text>
      {nearby && nearby.distanceM == null && (
        <Text style={[styles.hint, { color: theme.textSecondary }]}>{t.enableLocationHint}</Text>
      )}

      <BrutalBox theme={theme} style={styles.block} contentStyle={styles.arrivalsCard}>
        {arrivals == null ? (
          <View style={styles.placeholder}>
            <ActivityIndicator color={theme.text} />
          </View>
        ) : arrivals.length === 0 ? (
          <View style={styles.placeholder}>
            <Text style={[styles.hint, { color: theme.textSecondary }]}>{t.nearbyNoData}</Text>
          </View>
        ) : (
          arrivals.map((row, i) => (
            <React.Fragment key={`${row.route.id}-${row.direction.id}`}>
              {i > 0 && <DashedDivider theme={theme} />}
              <ArrivalRow
                row={row}
                t={t}
                theme={theme}
                onPress={() => onSelectRouteAndOpenMap(row.route.id, row.direction.id)}
              />
            </React.Fragment>
          ))
        )}
      </BrutalBox>

      <View style={[styles.grid, styles.block]}>
        <BrutalBox theme={theme} style={styles.gridItem} contentStyle={styles.tile} onPress={onNavigateToRoutes}>
          <Text style={[styles.tileTitle, { color: theme.text }]}>{t.hubRoutesTitle}</Text>
          <Text style={[styles.tileText, { color: theme.text }]}>{t.hubRoutesShort}</Text>
        </BrutalBox>
        <BrutalBox
          theme={theme}
          color={theme.live}
          style={styles.gridItem}
          contentStyle={styles.tile}
          onPress={() => onNavigateToMap()}
        >
          <Text style={[styles.tileTitle, { color: theme.onColor }]}>{t.hubMapTitle}</Text>
          <Text style={[styles.tileText, { color: theme.onColor }]}>{t.hubMapShort}</Text>
        </BrutalBox>
      </View>

      <BrutalBox
        theme={theme}
        color={theme.reward}
        style={styles.block}
        contentStyle={styles.shopRow}
        onPress={onNavigateToShop}
      >
        <Text style={[styles.tileTitle, styles.noMargin, { color: theme.onColor }]}>{t.hubShopTitle}</Text>
        <Text style={[styles.shopLink, { color: theme.onColor }]}>{t.hubShopBadge} →</Text>
      </BrutalBox>

      <BrutalBox theme={theme} style={styles.block} contentStyle={styles.howCard}>
        <Text style={[styles.howTitle, { color: theme.text }]}>{t.howItWorksTitle}</Text>
        {[t.step1, t.step2, t.step3].map((step, i) => (
          <View key={step} style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: theme.action }]}>
              <Text style={[styles.stepNumText, { color: theme.onAction }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.textSecondary }]}>{step}</Text>
          </View>
        ))}
      </BrutalBox>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  caption: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 14,
  },
  stopTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  block: {
    marginTop: 14,
  },
  arrivalsCard: {
    overflow: 'hidden',
  },
  placeholder: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  arrivalMain: {
    flex: 1,
    gap: 6,
  },
  arrivalDir: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 16,
  },
  etaCol: {
    alignItems: 'center',
    minWidth: 44,
  },
  etaValue: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
  },
  etaUnit: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 12,
    marginTop: -2,
  },
  dashed: {
    height: 0,
    borderWidth: 1.25,
    borderStyle: 'dashed',
    marginHorizontal: -2,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  gridItem: {
    flex: 1,
  },
  tile: {
    padding: 14,
    minHeight: 104,
  },
  tileTitle: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 17,
    marginBottom: 6,
  },
  noMargin: {
    marginBottom: 0,
  },
  tileText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  shopLink: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  howCard: {
    padding: 16,
    gap: 10,
  },
  howTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    marginBottom: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 12,
  },
  stepText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
