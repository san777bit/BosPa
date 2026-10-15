import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { IconTheme } from './Icons';

export default function Header({
  points = 50,
  lang = 'ru',
  onChangeLang,
  isDark = false,
  onToggleTheme,
  onOpenShop,
  theme,
}) {
  const languages = ['ru', 'kz', 'en'];

  return (
    <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={styles.left}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.brandInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>BosPa</Text>
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>LIVE</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {lang === 'kz' ? 'Бос па? · Алматы' : lang === 'en' ? 'Bos Pa? · Almaty' : 'Бос па? · Алматы'}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {/* Language selector segmented control */}
        <View style={[styles.langSwitch, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
          {languages.map((l) => {
            const isActive = lang === l;
            return (
              <TouchableOpacity
                key={l}
                style={[
                  styles.langBtn,
                  isActive && { backgroundColor: theme.primary },
                ]}
                onPress={() => onChangeLang(l)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.langText,
                    { color: isActive ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dark / Light Mode Button */}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
          onPress={onToggleTheme}
          activeOpacity={0.7}
        >
          <IconTheme size={18} color={theme.text} isDark={isDark} />
        </TouchableOpacity>

        {/* Points balance */}
        <TouchableOpacity
          style={[
            styles.pointsPill,
            { backgroundColor: theme.coinBg, borderColor: theme.coinBorder },
          ]}
          onPress={onOpenShop}
          activeOpacity={0.7}
        >
          <View style={[styles.coinCircle, { backgroundColor: theme.coin }]}>
            <Text style={styles.coinLetter}>B</Text>
          </View>
          <Text style={[styles.pointsValue, { color: isDark ? '#FDE68A' : '#92400E' }]}>
            {points}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
      },
    }),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  brandInfo: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langSwitch: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 2,
    borderWidth: 1,
  },
  langBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  langText: {
    fontSize: 10,
    fontWeight: '800',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  coinCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinLetter: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  pointsValue: {
    fontSize: 12,
    fontWeight: '800',
  },
});
