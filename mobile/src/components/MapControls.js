import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconCompass, IconRoutes } from './Icons';
import { BrutalBox } from './Brutal';
import { fonts } from '../theme/theme';

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
        <BrutalBox theme={theme} radius={22} offset={3} contentStyle={styles.controlBtn} onPress={onFitRoute}>
          <IconCompass size={18} color={theme.text} />
        </BrutalBox>

        <BrutalBox theme={theme} radius={22} offset={3} contentStyle={styles.controlBtn} onPress={onToggleStopsList}>
          <IconRoutes size={18} color={theme.text} />
        </BrutalBox>

        {/* Zoom cluster */}
        <BrutalBox theme={theme} radius={22} offset={3} contentStyle={styles.zoomCluster}>
          <TouchableOpacity style={styles.zoomBtn} onPress={onZoomIn} activeOpacity={0.7}>
            <Text style={[styles.zoomIcon, { color: theme.text }]}>+</Text>
          </TouchableOpacity>
          <View style={[styles.zoomDivider, { backgroundColor: theme.line }]} />
          <TouchableOpacity style={styles.zoomBtn} onPress={onZoomOut} activeOpacity={0.7}>
            <Text style={[styles.zoomIcon, { color: theme.text }]}>−</Text>
          </TouchableOpacity>
        </BrutalBox>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsWrap: {
    position: 'absolute',
    top: 130,
    right: 12,
    zIndex: 100,
  },
  topRightCol: {
    alignItems: 'center',
    gap: 6,
  },
  controlBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomCluster: {
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 2.5,
  },
  zoomIcon: {
    fontFamily: fonts.display,
    fontSize: 18,
  },
});
