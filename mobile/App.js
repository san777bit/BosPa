import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Unbounded_700Bold, Unbounded_900Black } from '@expo-google-fonts/unbounded';
import {
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
  Onest_800ExtraBold,
} from '@expo-google-fonts/onest';
import { themes, fonts } from './src/theme/theme';
import { translations } from './src/i18n/translations';
import { Api, stopsWithoutStatus } from './src/services/api';
import { getCurrentLocation } from './src/services/location';
import Header from './src/components/Header';
import RouteSelector from './src/components/RouteSelector';
import TransitMap from './src/components/TransitMap';
import DetailCard from './src/components/DetailCard';
import CheckinModal from './src/components/CheckinModal';
import StopsListDrawer from './src/components/StopsListDrawer';
import MapControls from './src/components/MapControls';
import RewardToast from './src/components/RewardToast';
import HomeScreen from './src/screens/HomeScreen';
import RoutesListScreen from './src/screens/RoutesListScreen';
import ShopScreen from './src/screens/ShopScreen';
import { IconHome, IconMap, IconRoutes, IconShop } from './src/components/Icons';

const NAV_TABS = [
  { id: 'home', Icon: IconHome, label: 'navHome' },
  { id: 'routes', Icon: IconRoutes, label: 'navRoutes' },
  { id: 'map', Icon: IconMap, label: 'navMap' },
  { id: 'shop', Icon: IconShop, label: 'navShop' },
];

export default function App() {
  const mapRef = useRef(null);
  // Без шрифтов (ошибка загрузки) приложение работает на системных
  const [fontsLoaded, fontsError] = useFonts({
    Unbounded_700Bold,
    Unbounded_900Black,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
    Onest_800ExtraBold,
  });

  const [lang, setLang] = useState('ru');
  const [isDark, setIsDark] = useState(false);

  const t = translations[lang] || translations.ru;
  const currentTheme = isDark ? themes.dark : themes.light;

  const [activeTab, setActiveTab] = useState('home');

  // 'loading' | 'error' | 'ready'
  const [loadState, setLoadState] = useState('loading');
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const currentRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const [selectedDirId, setSelectedDirId] = useState(null);
  const currentDirection =
    currentRoute?.directions.find((d) => d.id === selectedDirId) || currentRoute?.directions[0];

  const [vehicles, setVehicles] = useState([]);
  const [stopsWithStatus, setStopsWithStatus] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  const [userPoints, setUserPoints] = useState(0);
  const [checkinModalVisible, setCheckinModalVisible] = useState(false);
  const [stopsDrawerVisible, setStopsDrawerVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', points: 10, title: null });

  const loadInitial = async () => {
    setLoadState('loading');
    try {
      const [loadedRoutes, me] = await Promise.all([Api.getRoutes(), Api.getMe()]);
      if (loadedRoutes.length === 0) throw new Error('no routes');
      setRoutes(loadedRoutes);
      setSelectedRouteId((prev) => prev || loadedRoutes[0]?.id || null);
      setUserPoints(me.balance);
      setLoadState('ready');
    } catch (e) {
      console.warn('BosPa API:', e.message);
      setLoadState('error');
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const handleSelectRoute = (routeId) => {
    setSelectedRouteId(routeId);
    const newRoute = routes.find((r) => r.id === routeId);
    const firstDirId = newRoute?.directions[0]?.id || null;
    setSelectedDirId(firstDirId);
    setSelectedItem(null);
  };

  const handleSelectDir = (dirId) => {
    setSelectedDirId(dirId);
    setSelectedItem(null);
  };

  const handleOpenRouteOnMap = (routeId, dirId) => {
    setSelectedRouteId(routeId);
    setSelectedDirId(dirId);
    setSelectedItem(null);
    setActiveTab('map');
  };

  // При смене маршрута данные прошлого сбрасываются сразу, не дожидаясь сервера:
  // иначе карта, список остановок и счётчик «на линии» показывают чужие остановки и борта
  useEffect(() => {
    setVehicles([]);
    setStopsWithStatus(currentDirection ? stopsWithoutStatus(currentDirection) : []);
    setSelectedItem(null);
  }, [currentRoute?.id, currentDirection?.id]);

  // Маршрут приходит в карту, пока вкладка скрыта, — при открытии показываем его целиком
  useEffect(() => {
    if (activeTab === 'map') mapRef.current?.fitRoute();
  }, [activeTab, currentRoute?.id, currentDirection?.id]);

  // Обновление карты по запросу (после отметки), не дожидаясь очередного тика
  const refreshRef = useRef(null);

  useEffect(() => {
    if (loadState !== 'ready' || activeTab !== 'map' || !currentRoute || !currentDirection) {
      return undefined;
    }
    let cancelled = false;
    const routeId = currentRoute.id;
    const direction = currentDirection;

    const updateTick = async () => {
      let liveVehs;
      let stopsStatus;
      try {
        [liveVehs, stopsStatus] = await Promise.all([
          Api.getVehicles(routeId, direction.id),
          Api.getStopsStatus(direction, routeId),
        ]);
      } catch (e) {
        return; // сеть пропала — повторим на следующем тике
      }
      if (cancelled) return;

      setVehicles(liveVehs);
      setStopsWithStatus(stopsStatus);

      if (mapRef.current) {
        mapRef.current.updateVehicles(liveVehs);
        mapRef.current.updateStops(stopsStatus);
      }

      setSelectedItem((prev) => {
        if (!prev) return null;
        if (prev.kind === 'stop') {
          const fresh = stopsStatus.find((s) => s.stop_id === prev.data.stop_id);
          return fresh ? { kind: 'stop', data: fresh } : prev;
        }
        if (prev.kind === 'vehicle') {
          const fresh = liveVehs.find((v) => v.id === prev.data.id);
          return fresh ? { kind: 'vehicle', data: fresh } : prev;
        }
        return prev;
      });
    };

    refreshRef.current = updateTick;
    updateTick();
    // Сервер пересчитывает борта раз в 3 с (fusion_interval_s)
    const interval = setInterval(updateTick, 3000);
    return () => {
      cancelled = true;
      refreshRef.current = null;
      clearInterval(interval);
    };
  }, [loadState, activeTab, currentRoute?.id, currentDirection?.id]);

  const handleSelectStop = (stop) => {
    setSelectedItem({ kind: 'stop', data: stop });
    if (mapRef.current) {
      mapRef.current.flyTo(stop.lat, stop.lon, 16);
    }
  };

  const handleSelectVehicle = (vehicle) => {
    setSelectedItem({ kind: 'vehicle', data: vehicle });
    if (mapRef.current) {
      mapRef.current.flyTo(vehicle.lat, vehicle.lon, 16);
    }
  };

  // Отметка всегда привязана к остановке: для борта берём ближайшую к нему по линии
  const nearestStopId = (vehicle) => {
    let best = null;
    currentDirection.stops.forEach((stop) => {
      if (!best || Math.abs(stop.s - vehicle.s) < Math.abs(best.s - vehicle.s)) best = stop;
    });
    return best?.id;
  };

  const showToast = (fields) => setToast({ visible: true, points: 0, title: null, ...fields });

  const handleCheckinSubmit = async (level) => {
    if (!selectedItem || !currentRoute || !currentDirection) return;
    const stopId =
      selectedItem.kind === 'stop' ? selectedItem.data.stop_id : nearestStopId(selectedItem.data);
    setCheckinModalVisible(false);

    let res;
    try {
      // Геопозиция нужна серверу для антифрода: без неё отметка учитывается без баллов
      const loc = await getCurrentLocation();
      if (loc) await Api.sendLocation(loc.lat, loc.lon);
      res = await Api.submitCheckin(currentRoute.id, currentDirection.id, stopId, level);
    } catch (e) {
      showToast({ title: t.toastErrorTitle, message: t.toastNetworkError });
      return;
    }

    if (!res.accepted) {
      showToast({ title: t.toastErrorTitle, message: t.toastCheckinCooldown });
      return;
    }
    setUserPoints(res.balance);
    if (res.rewarded) {
      showToast({ message: t.toastCheckinSuccess, points: res.points });
    } else {
      const hourly = res.reasons.includes('hourly_limit');
      showToast({
        title: t.toastCountedTitle,
        message: hourly ? t.toastCheckinHourlyLimit : t.toastCheckinNoPoints,
      });
    }
    refreshRef.current?.();
  };

  const handleDeductPoints = (amount) => {
    setUserPoints((prev) => Math.max(0, prev - amount));
  };

  if (loadState !== 'ready' || !currentRoute || !(fontsLoaded || fontsError)) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.safeArea, styles.centered, { backgroundColor: currentTheme.bg }]}>
          {loadState === 'error' ? (
            <>
              <Text style={[styles.statusText, { color: currentTheme.text }]}>{t.loadError}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: currentTheme.action }]}
                onPress={loadInitial}
                activeOpacity={0.8}
              >
                <Text style={[styles.retryText, { color: currentTheme.onAction }]}>{t.retry}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={currentTheme.text} />
              <Text style={[styles.statusText, { color: currentTheme.textSecondary }]}>
                {t.loadingData}
              </Text>
            </>
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: currentTheme.bg }]}
        edges={['top', 'left', 'right']}
      >
        <StatusBar
          barStyle={currentTheme.statusBarStyle}
          backgroundColor={currentTheme.bg}
        />

        <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
          <Header
            points={userPoints}
            lang={lang}
            onChangeLang={setLang}
            isDark={isDark}
            onToggleTheme={() => setIsDark((prev) => !prev)}
            onOpenShop={() => setActiveTab('shop')}
            theme={currentTheme}
          />

          <View style={styles.contentArea}>
            {activeTab === 'home' && (
              <HomeScreen
                points={userPoints}
                routes={routes}
                t={t}
                theme={currentTheme}
                onNavigateToRoutes={() => setActiveTab('routes')}
                onNavigateToMap={() => setActiveTab('map')}
                onNavigateToShop={() => setActiveTab('shop')}
                onSelectRouteAndOpenMap={handleOpenRouteOnMap}
              />
            )}

            {activeTab === 'routes' && (
              <RoutesListScreen
                routes={routes}
                t={t}
                theme={currentTheme}
                onSelectRouteAndOpenMap={handleOpenRouteOnMap}
              />
            )}

            {activeTab === 'shop' && (
              <ShopScreen
                points={userPoints}
                t={t}
                theme={currentTheme}
                lang={lang}
                onDeductPoints={handleDeductPoints}
              />
            )}

            <View
              style={[
                styles.mapScreenContainer,
                { display: activeTab === 'map' ? 'flex' : 'none' },
              ]}
            >
              <RouteSelector
                routes={routes}
                selectedRouteId={selectedRouteId}
                selectedDirId={selectedDirId}
                onSelectRoute={handleSelectRoute}
                onSelectDir={handleSelectDir}
                activeVehiclesCount={vehicles.length}
                t={t}
                theme={currentTheme}
              />

              <View style={styles.mapContainer}>
                <TransitMap
                  route={currentRoute}
                  direction={currentDirection}
                  stopsWithStatus={stopsWithStatus}
                  vehicles={vehicles}
                  isDark={isDark}
                  onSelectStop={handleSelectStop}
                  onSelectVehicle={handleSelectVehicle}
                  onDeselect={() => setSelectedItem(null)}
                  mapRef={mapRef}
                />

                <MapControls
                  theme={currentTheme}
                  onFitRoute={() => mapRef.current?.fitRoute()}
                  onZoomIn={() => mapRef.current?.zoomIn()}
                  onZoomOut={() => mapRef.current?.zoomOut()}
                  onToggleStopsList={() => setStopsDrawerVisible(true)}
                />

                <DetailCard
                  selectedItem={selectedItem}
                  t={t}
                  theme={currentTheme}
                  onClose={() => setSelectedItem(null)}
                  onCheckinPress={() => setCheckinModalVisible(true)}
                />
              </View>
            </View>
          </View>

          <View style={[styles.bottomNav, { backgroundColor: currentTheme.navBg }]}>
            {NAV_TABS.map(({ id, Icon, label }) => {
              const active = activeTab === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.navItem, active && { backgroundColor: currentTheme.navActive }]}
                  onPress={() => setActiveTab(id)}
                  activeOpacity={0.7}
                >
                  <Icon size={20} color={active ? currentTheme.navIconActive : currentTheme.navIcon} />
                  <Text style={[styles.navLabel, { color: active ? currentTheme.navIconActive : currentTheme.navIcon }]}>{t[label]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <CheckinModal
          visible={checkinModalVisible}
          target={
            selectedItem
              ? {
                  name:
                    selectedItem.kind === 'stop'
                      ? selectedItem.data.name
                      : `${t.vehicleLabel} ${selectedItem.data.ext_id || ''}`.trim(),
                }
              : null
          }
          t={t}
          theme={currentTheme}
          onClose={() => setCheckinModalVisible(false)}
          onSubmit={handleCheckinSubmit}
        />

        <StopsListDrawer
          visible={stopsDrawerVisible}
          directionTitle={currentDirection?.title || ''}
          stopsWithStatus={stopsWithStatus}
          t={t}
          theme={currentTheme}
          onClose={() => setStopsDrawerVisible(false)}
          onSelectStop={handleSelectStop}
        />

        <RewardToast
          visible={toast.visible}
          message={toast.message}
          points={toast.points}
          title={toast.title}
          theme={currentTheme}
          onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  contentArea: {
    flex: 1,
  },
  mapScreenContainer: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  bottomNav: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
    borderRadius: 18,
  },
  navLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
});
