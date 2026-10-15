import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { IconMap, IconRoutes, IconShop } from '../components/Icons';

export default function HomeScreen({
  points = 50,
  routes = [],
  t,
  theme,
  onNavigateToRoutes,
  onNavigateToMap,
  onNavigateToShop,
  onSelectRouteAndOpenMap,
}) {
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Brand Hero Banner */}
      <View style={[styles.heroBanner, { backgroundColor: theme.primaryDark }]}>
        <View style={styles.heroContent}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <View style={styles.heroTextCol}>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>{t.brandName}</Text>
              <View style={[styles.liveTag, { backgroundColor: theme.primaryLight }]}>
                <Text style={styles.liveTagText}>{t.brandBadge}</Text>
              </View>
            </View>
            <Text style={styles.heroSubtitle}>
              {t.heroSubtitle}
            </Text>
          </View>
        </View>

        {/* User Balance Strip */}
        <TouchableOpacity style={styles.balanceStrip} onPress={onNavigateToShop} activeOpacity={0.8}>
          <View style={styles.balanceLeft}>
            <View style={styles.coinBadge}>
              <Text style={styles.coinLetter}>B</Text>
            </View>
            <View>
              <Text style={styles.balanceLabel}>{t.pointsBalance}</Text>
              <Text style={styles.balanceValue}>{points} {t.pointsUnit}</Text>
            </View>
          </View>
          <View style={styles.balanceButton}>
            <Text style={styles.balanceButtonText}>{t.toShop}</Text>
            <Text style={styles.chevronText}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Action Hub */}
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: theme.text }]}>{t.hubTitle}</Text>
        <View style={styles.hubGrid}>
          {/* Card: Routes */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={onNavigateToRoutes}
            activeOpacity={0.7}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: theme.primaryBg }]}>
              <IconRoutes size={22} color={theme.primary} />
            </View>
            <Text style={[styles.hubCardTitle, { color: theme.text }]}>{t.hubRoutesTitle}</Text>
            <Text style={[styles.hubCardSubtitle, { color: theme.textSecondary }]}>{t.hubRoutesSubtitle}</Text>
            <View style={styles.hubCardLink}>
              <Text style={[styles.hubCardLinkText, { color: theme.primary }]}>{t.hubRoutesLink}</Text>
              <Text style={[styles.linkArrow, { color: theme.primary }]}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Card: Map */}
          <TouchableOpacity
            style={[styles.hubCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onNavigateToMap()}
            activeOpacity={0.7}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: theme.isDark ? '#082F49' : '#E0F2FE' }]}>
              <IconMap size={22} color="#0284C7" />
            </View>
            <Text style={[styles.hubCardTitle, { color: theme.text }]}>{t.hubMapTitle}</Text>
            <Text style={[styles.hubCardSubtitle, { color: theme.textSecondary }]}>{t.hubMapSubtitle}</Text>
            <View style={styles.hubCardLink}>
              <Text style={[styles.hubCardLinkText, { color: '#0284C7' }]}>{t.hubMapLink}</Text>
              <Text style={[styles.linkArrow, { color: '#0284C7' }]}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Card: Shop */}
          <TouchableOpacity
            style={[styles.hubCard, styles.hubCardFull, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={onNavigateToShop}
            activeOpacity={0.7}
          >
            <View style={styles.shopCardRow}>
              <View style={[styles.hubIconCircle, { backgroundColor: theme.coinBg }]}>
                <IconShop size={22} color={theme.coin} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.hubCardTitle, { color: theme.text }]}>{t.hubShopTitle}</Text>
                <Text style={[styles.hubCardSubtitle, { color: theme.textSecondary }]}>
                  {t.hubShopSubtitle}
                </Text>
              </View>
              <View style={[styles.shopBadge, { backgroundColor: theme.coinBg, borderColor: theme.coinBorder }]}>
                <Text style={[styles.shopBadgeText, { color: theme.coin }]}>{t.hubShopBadge}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Routes Quick List */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeader, { color: theme.text }]}>{t.availableRoutes}</Text>
          <TouchableOpacity onPress={onNavigateToRoutes}>
            <Text style={[styles.viewAllText, { color: theme.primary }]}>
              {t.allRoutesCount} ({routes.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.routesList}>
          {routes.map((route) => {
            const isTrolley = route.kind === 'trolleybus';
            const firstDir = route.directions[0];
            return (
              <TouchableOpacity
                key={route.id}
                style={[styles.routeItemCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => onSelectRouteAndOpenMap(route.id, firstDir.id)}
                activeOpacity={0.7}
              >
                <View style={styles.routeBadgeCol}>
                  <View
                    style={[
                      styles.routeBadge,
                      { backgroundColor: isTrolley ? '#0284C7' : '#059669' },
                    ]}
                  >
                    <Text style={styles.routeNumberText}>{route.short}</Text>
                  </View>
                  <Text style={[styles.routeTypeLabel, { color: theme.textSecondary }]}>
                    {isTrolley ? t.trolleybus : t.bus}
                  </Text>
                </View>

                <View style={styles.routeMainCol}>
                  <Text style={[styles.routeTitleText, { color: theme.text }]}>{route.title}</Text>
                  <Text style={[styles.routeDestText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {firstDir.title}
                  </Text>
                  <View style={styles.routeMetaRow}>
                    <Text style={[styles.routeMetaItem, { color: theme.textMuted }]}>
                      {firstDir.stops.length} {t.stopsCount}
                    </Text>
                    <Text style={[styles.routeMetaDot, { color: theme.border }]}>•</Text>
                    <Text style={[styles.routeMetaItem, { color: theme.textMuted }]}>
                      {t.intervalText}
                    </Text>
                  </View>
                </View>

                <View style={styles.routeActionCol}>
                  <View style={[styles.onMapBtn, { backgroundColor: theme.primaryBg, borderColor: theme.primaryBorder }]}>
                    <Text style={[styles.onMapBtnText, { color: theme.primary }]}>{t.onMap}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* How it works info */}
      <View style={[styles.section, { marginBottom: 30 }]}>
        <View style={[styles.howItWorksCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.howItWorksTitle, { color: theme.text }]}>{t.howItWorksTitle}</Text>
          <View style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: theme.primaryBg }]}>
              <Text style={[styles.stepNumText, { color: theme.primary }]}>1</Text>
            </View>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              {t.step1}
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: theme.primaryBg }]}>
              <Text style={[styles.stepNumText, { color: theme.primary }]}>2</Text>
            </View>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              {t.step2}
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={[styles.stepNum, { backgroundColor: theme.primaryBg }]}>
              <Text style={[styles.stepNumText, { color: theme.primary }]}>3</Text>
            </View>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              {t.step3}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBanner: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  heroLogo: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  liveTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    color: '#D1FAE5',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
    fontWeight: '500',
  },
  balanceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coinBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinLetter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  balanceLabel: {
    color: '#D1FAE5',
    fontSize: 11,
    fontWeight: '600',
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  balanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  balanceButtonText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '800',
  },
  chevronText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  hubCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
      },
    }),
  },
  hubCardFull: {
    width: '100%',
  },
  shopCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shopBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  shopBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  hubIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  hubCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  hubCardSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 12,
  },
  hubCardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  hubCardLinkText: {
    fontSize: 12,
    fontWeight: '800',
  },
  linkArrow: {
    fontSize: 12,
    fontWeight: '800',
  },
  routesList: {
    gap: 10,
  },
  routeItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  routeBadgeCol: {
    alignItems: 'center',
    width: 60,
  },
  routeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  routeNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  routeTypeLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  routeMainCol: {
    flex: 1,
  },
  routeTitleText: {
    fontSize: 14,
    fontWeight: '800',
  },
  routeDestText: {
    fontSize: 12,
    marginTop: 2,
  },
  routeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  routeMetaItem: {
    fontSize: 11,
    fontWeight: '600',
  },
  routeMetaDot: {
    fontSize: 10,
  },
  routeActionCol: {
    justifyContent: 'center',
  },
  onMapBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  onMapBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  howItWorksCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  howItWorksTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
  },
  stepDesc: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
