import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { BrutalBox } from './Brutal';
import { fonts, themes } from '../theme/theme';

export default function RewardToast({ message, points = 10, title, visible, onHide, theme = themes.light }) {
  // Жёлтый (награда) — только когда баллы реально начислены; остальные сообщения нейтральные
  const rewarded = points > 0;
  const fg = rewarded ? theme.onColor : theme.text;
  const translateY = new Animated.Value(-100);
  const opacity = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: Platform.OS !== 'web',
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 250,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start(() => {
          onHide && onHide();
        });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
      <BrutalBox theme={theme} color={rewarded ? theme.reward : theme.surface} radius={18} style={styles.toastWrap} contentStyle={styles.toastCard}>
        <View style={[styles.badgeWrap, { backgroundColor: rewarded ? theme.reward : theme.surfaceAlt, borderColor: rewarded ? theme.onColor : theme.line }]}>
          <Text style={[styles.badgeText, { color: fg }]}>+B</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: fg }]}>{title || `+${points} баллов BosPa`}</Text>
          <Text style={[styles.desc, { color: fg }]}>{message}</Text>
        </View>
      </BrutalBox>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 55,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastWrap: {
    alignSelf: 'stretch',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  badgeWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.display,
    fontSize: 12,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
  },
  desc: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
});
