import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { themes } from './src/theme/theme';
import { translations } from './src/i18n/translations';
import { TransitService } from './src/services/transitService';
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

export default function App() {
  const mapRef = useRef(null);

  const [lang, setLang] = useState('ru');
  const [isDark, setIsDark] = useState(false);

  const t = translations[lang] || translations.ru;
  const currentTheme = isDark ? themes.dark : themes.light;

  const [activeTab, setActiveTab] = useState('home');

  const routes = TransitService.getRoutes();
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id || 't7');
  const currentRoute = TransitService.getRoute(selectedRouteId);
  const [selectedDirId, setSelectedDirId] = useState(currentRoute?.directions[0]?.id || 'a');
  const currentDirection = TransitService.getDirection(selectedRouteId, selectedDirId);

  const [vehicles, setVehicles] = useState([]);
  const [stopsWithStatus, setStopsWithStatus] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  const [userPoints, setUserPoints] = useState(50);
  const [checkinModalVisible, setCheckinModalVisible] = useState(false);
  const [stopsDrawerVisible, setStopsDrawerVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', points: 10 });

  const handleSelectRoute = (routeId) => {
    setSelectedRouteId(routeId);
    const newRoute = TransitService.getRoute(routeId);
    const firstDirId = newRoute?.directions[0]?.id || 'a';
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

  useEffect(() => {
    const updateTick = () => {
      const liveVehs = TransitService.getLiveVehicles(selectedRouteId, selectedDirId);
      const stopsStatus = TransitService.getStopsStatus(selectedRouteId, selectedDirId, liveVehs);

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

    updateTick();
    const interval = setInterval(updateTick, 2000);
    return () => clearInterval(interval);
  }, [selectedRouteId, selectedDirId]);

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

  const handleCheckinSubmit = (level) => {
    if (!selectedItem) return;

    const stopId =
      selectedItem.kind === 'stop' ? selectedItem.data.stop_id : stopsWithStatus[0]?.stop_id;

    const result = TransitService.submitCheckin(
      selectedRouteId,
      selectedDirId,
      stopId,
      level,
    );

    setUserPoints((prev) => prev + result.pointsEarned);
    setCheckinModalVisible(false);

    const liveVehs = TransitService.getLiveVehicles(selectedRouteId, selectedDirId);
    const nextStopsStatus = TransitService.getStopsStatus(selectedRouteId, selectedDirId, liveVehs);
    setVehicles(liveVehs);
    setStopsWithStatus(nextStopsStatus);

    if (mapRef.current) {
      mapRef.current.updateVehicles(liveVehs);
      mapRef.current.updateStops(nextStopsStatus);
    }

    setToast({
      visible: true,
      message: t.toastCheckinSuccess,
      points: result.pointsEarned,
    });
  };

  const handleDeductPoints = (amount) => {
    setUserPoints((prev) => Math.max(0, prev - amount));
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: currentTheme.card }]}
        edges={['top', 'left', 'right']}
      >
        <StatusBar
          barStyle={currentTheme.statusBarStyle}
          backgroundColor={currentTheme.card}
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

          <View
            style={[
              styles.bottomNav,
              { backgroundColor: currentTheme.navBg, borderTopColor: currentTheme.navBorder },
            ]}
          >
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setActiveTab('home')}
              activeOpacity={0.7}
            >
              <IconHome
                size={20}
                color={activeTab === 'home' ? currentTheme.primary : currentTheme.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: activeTab === 'home' ? currentTheme.primary : currentTheme.textMuted },
                ]}
              >
                {t.navHome}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setActiveTab('routes')}
              activeOpacity={0.7}
            >
              <IconRoutes
                size={20}
                color={activeTab === 'routes' ? currentTheme.primary : currentTheme.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: activeTab === 'routes' ? currentTheme.primary : currentTheme.textMuted },
                ]}
              >
                {t.navRoutes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setActiveTab('map')}
              activeOpacity={0.7}
            >
              <IconMap
                size={20}
                color={activeTab === 'map' ? currentTheme.primary : currentTheme.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: activeTab === 'map' ? currentTheme.primary : currentTheme.textMuted },
                ]}
              >
                {t.navMap}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => setActiveTab('shop')}
              activeOpacity={0.7}
            >
              <IconShop
                size={20}
                color={activeTab === 'shop' ? currentTheme.primary : currentTheme.textMuted}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: activeTab === 'shop' ? currentTheme.primary : currentTheme.textMuted },
                ]}
              >
                {t.navShop}
              </Text>
            </TouchableOpacity>
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
                      : `${t.vehicleLabel} ${selectedItem.data.ext_id}`,
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
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 -2px 10px rgba(15,23,42,0.06)',
      },
    }),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
