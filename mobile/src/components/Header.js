import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconTheme } from './Icons';
import { BrutalBox } from './Brutal';
import { fonts } from '../theme/theme';

const LANGUAGES = ['ru', 'kz', 'en'];

export default function Header({
  points = 0,
  lang = 'ru',
  onChangeLang,
  isDark = false,
  onToggleTheme,
  onOpenShop,
  theme,
}) {
  // Одна кнопка вместо переключателя: RU → KZ → EN по кругу
  const nextLang = LANGUAGES[(LANGUAGES.indexOf(lang) + 1) % LANGUAGES.length];

  return (
    <View style={[styles.header, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>BosPa</Text>

      <View style={styles.right}>
        <BrutalBox
          theme={theme}
          radius={12}
          offset={3}
          contentStyle={styles.squareBtn}
          onPress={() => onChangeLang(nextLang)}
        >
          <Text style={[styles.langText, { color: theme.text }]}>{lang.toUpperCase()}</Text>
        </BrutalBox>

        <BrutalBox theme={theme} radius={12} offset={3} contentStyle={styles.squareBtn} onPress={onToggleTheme}>
          <IconTheme size={18} color={theme.text} isDark={isDark} />
        </BrutalBox>

        <BrutalBox theme={theme} radius={999} offset={3} contentStyle={styles.pointsPill} onPress={onOpenShop}>
          <View style={[styles.coin, { backgroundColor: theme.reward, borderColor: theme.outline }]}>
            <Text style={[styles.coinLetter, { color: theme.onColor }]}>B</Text>
          </View>
          <Text style={[styles.pointsValue, { color: theme.text }]}>{points}</Text>
        </BrutalBox>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  squareBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 12,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingLeft: 5,
    paddingRight: 14,
  },
  coin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinLetter: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 12,
  },
  pointsValue: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 16,
  },
});
