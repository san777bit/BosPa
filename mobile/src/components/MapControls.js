import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { IconCompass, IconRoutes } from './Icons';

export default function MapControls({
  theme,
  onFitRoute,
  onZoomIn,
  onZoomOut,
  onToggleStopsList,
}) {
  return (
    <View style={styles.controlsWrap} pointerEvents="box-none">
      <View style={styles.topRightCol}>
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={onFitRoute}
          activeOpacity={0.7}
        >
          <IconCompass size={18} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={onToggleStopsList}
          activeOpacity={0.7}
        >
          <IconRoutes size={18} color={theme.text} />
        </TouchableOpacity>

        {/* Zoom cluster */}
        <View style={[styles.zoomCluster, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.zoomBtn} onPress={onZoomIn} activeOpacity={0.7}>
            <Text style={[styles.zoomIcon, { color: theme.text }]}>+</Text>
          </TouchableOpacity>
          <View style={[styles.zoomDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={styles.zoomBtn} onPress={onZoomOut} activeOpacity={0.7}>
            <Text style={[styles.zoomIcon, { color: theme.text }]}>−</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsWrap: {
    position: 'absolute',
    top: 130,
    right: 16,
    zIndex: 100,
  },
  topRightCol: {
    alignItems: 'center',
    gap: 10,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 10px rgba(15,23,42,0.12)',
      },
    }),
  },
  zoomCluster: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 10px rgba(15,23,42,0.12)',
      },
    }),
  },
  zoomBtn: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
  },
  zoomIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
});
