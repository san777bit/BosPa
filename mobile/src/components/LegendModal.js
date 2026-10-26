import React from 'react';
import { View, Text, StyleSheet, Modal, Image, ScrollView } from 'react-native';
import { LEVELS } from '../theme/colors';
import { BrutalBox } from './Brutal';
import { fonts, themes } from '../theme/theme';

// Окно без пропа theme: рисуется токенами светлой темы
const theme = themes.light;

export default function LegendModal({ visible, onClose }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BrutalBox theme={theme} radius={24} offset={5} style={styles.modalWrap} contentStyle={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header with Logo */}
            <View style={styles.header}>
              <Image
                source={require('../../assets/icon.png')}
                style={[styles.logo, { borderColor: theme.outline }]}
                resizeMode="contain"
              />
              <View style={styles.titleCol}>
                <Text style={[styles.title, { color: theme.text }]}>О приложении BosPa</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  «Бос па?» — свободно ли в автобусе?
                </Text>
              </View>
              <BrutalBox
                theme={theme}
                radius={16}
                offset={2}
                color={theme.surfaceAlt}
                contentStyle={styles.closeBtn}
                onPress={onClose}
              >
                <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
              </BrutalBox>
            </View>

            {/* Description */}
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              BosPa помогает пассажирам Алматы знать реальную заполненность троллейбусов и автобусов ещё до того, как они подъедут к остановке.
            </Text>

            {/* Legend Levels */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Цвета загруженности</Text>
            <View style={styles.levelsList}>
              {LEVELS.map((lvl) => (
                <View
                  key={lvl.id}
                  style={[styles.levelCard, { backgroundColor: lvl.bg, borderColor: theme.outline }]}
                >
                  <View style={[styles.levelDot, { backgroundColor: theme.surface, borderColor: theme.outline }]} />
                  <View style={styles.levelInfo}>
                    <Text style={[styles.levelName, { color: theme.onColor }]}>{lvl.badge}</Text>
                    <Text style={[styles.levelHint, { color: theme.onColor }]}>{lvl.hint}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Rewards System */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Баллы и награды</Text>
            <BrutalBox
              theme={theme}
              color={theme.reward}
              radius={16}
              offset={3}
              style={styles.rewardWrap}
              contentStyle={styles.rewardCard}
            >
              <Text style={styles.rewardEmoji}>🪙</Text>
              <View style={styles.rewardContent}>
                <Text style={[styles.rewardTitle, { color: theme.onColor }]}>+10 баллов за каждую отметку</Text>
                <Text style={[styles.rewardDesc, { color: theme.onColor }]}>
                  Отмечайтесь на остановках и в салоне автобуса, повышайте точность карты и обменивайте баллы на поездки и скидки у партнёров.
                </Text>
              </View>
            </BrutalBox>

            {/* Close button */}
            <BrutalBox
              theme={theme}
              color={theme.action}
              radius={16}
              offset={3}
              contentStyle={styles.gotItButton}
              onPress={onClose}
            >
              <Text style={[styles.gotItText, { color: theme.onAction }]}>Понятно</Text>
            </BrutalBox>
          </ScrollView>
        </BrutalBox>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalWrap: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
  },
  modal: {
    flexShrink: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2.5,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 16,
  },
  subtitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 14,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    marginBottom: 10,
  },
  levelsList: {
    gap: 8,
    marginBottom: 16,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 2.5,
    gap: 10,
  },
  levelDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 14,
  },
  levelHint: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  rewardWrap: {
    marginBottom: 18,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  rewardEmoji: {
    fontSize: 20,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 14,
    marginBottom: 2,
  },
  rewardDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  gotItButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  gotItText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 16,
  },
});
