import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { fonts, statusColor, routeColor } from '../theme/theme';

// Плашка с толстой обводкой и жёсткой тенью. Тень — отдельный слой со сдвигом:
// shadow*/elevation в React Native размывают тень, а здесь она нужна чёткой на всех платформах.
// style — внешняя раскладка (ширина, flex, отступы), contentStyle — сама плашка (padding и т. п.).
// С onPress плашка «вдавливается» в тень при нажатии.
// flat — вложенная панель внутри другой плашки: тонкая рамка line, без тени.
export function BrutalBox({
  theme,
  color,
  radius = 18,
  offset = 4,
  flat = false,
  style,
  contentStyle,
  onPress,
  children,
}) {
  const [pressed, setPressed] = useState(false);
  const depth = flat ? 0 : offset;
  const shift = pressed ? depth : 0;
  const body = (
    <>
      {!flat && (
        <View
          pointerEvents="none"
          style={[
            styles.shadow,
            { top: offset, left: offset, right: -offset, bottom: -offset, borderRadius: radius, backgroundColor: theme.outline },
          ]}
        />
      )}
      <View
        style={[
          {
            flexGrow: 1,
            backgroundColor: color || (flat ? theme.surfaceAlt : theme.surface),
            borderRadius: radius,
            borderWidth: flat ? 2 : theme.borderWidth,
            borderColor: flat ? theme.line : theme.outline,
            transform: [{ translateX: shift }, { translateY: shift }],
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </>
  );

  const outer = [{ marginRight: depth, marginBottom: depth }, style];
  if (!onPress) return <View style={outer}>{body}</View>;
  return (
    <Pressable
      style={outer}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
    >
      {body}
    </Pressable>
  );
}

// Номер маршрута в цветной рамке
export function RouteBadge({ route, theme, size = 'md' }) {
  const big = size === 'md';
  return (
    <View
      style={[
        styles.badge,
        big ? styles.badgeMd : styles.badgeSm,
        { backgroundColor: routeColor(theme, route.kind), borderColor: theme.outline, borderWidth: theme.borderWidth },
      ]}
    >
      <Text style={[styles.badgeText, { fontSize: big ? 18 : 13, color: theme.onColor }]} numberOfLines={1}>
        {route.short}
      </Text>
    </View>
  );
}

// Плашка загруженности: «Свободно» / «Плотненько» / «Не влезешь» / «Нет данных»
export function LevelPill({ level, t, theme, small = false }) {
  const hasLevel = level === 0 || level === 1 || level === 2;
  const label = hasLevel ? t[`level${level}Badge`] : t.levelNoneBadge;
  return (
    <View
      style={[
        styles.pill,
        small && styles.pillSm,
        {
          backgroundColor: statusColor(theme, level),
          borderColor: theme.outline,
          borderWidth: small ? 2 : theme.borderWidth - 0.5,
        },
      ]}
    >
      <Text style={[styles.pillText, small && styles.pillTextSm, { color: theme.onColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMd: {
    minWidth: 58,
    height: 46,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  badgeSm: {
    minWidth: 40,
    height: 30,
    paddingHorizontal: 6,
    borderRadius: 9,
  },
  badgeText: {
    fontFamily: fonts.display,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  pillTextSm: {
    fontSize: 11,
  },
});
