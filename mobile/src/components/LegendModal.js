import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Platform, ScrollView } from 'react-native';
import { Colors, LEVELS } from '../theme/colors';

export default function LegendModal({ visible, onClose }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header with Logo */}
            <View style={styles.header}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <View style={styles.titleCol}>
                <Text style={styles.title}>О приложении BosPa</Text>
                <Text style={styles.subtitle}>«Бос па?» — свободно ли в автобусе?</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text style={styles.description}>
              BosPa помогает пассажирам Алматы знать реальную заполненность троллейбусов и автобусов ещё до того, как они подъедут к остановке.
            </Text>

            {/* Legend Levels */}
            <Text style={styles.sectionTitle}>Цвета загруженности</Text>
            <View style={styles.levelsList}>
              {LEVELS.map((lvl) => (
                <View key={lvl.id} style={[styles.levelCard, { backgroundColor: lvl.bg }]}>
                  <Text style={styles.levelEmoji}>{lvl.emoji}</Text>
                  <View style={styles.levelInfo}>
                    <Text style={[styles.levelName, { color: lvl.color }]}>{lvl.badge}</Text>
                    <Text style={styles.levelHint}>{lvl.hint}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Rewards System */}
            <Text style={styles.sectionTitle}>Баллы и награды</Text>
            <View style={styles.rewardCard}>
              <Text style={styles.rewardEmoji}>🪙</Text>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardTitle}>+10 баллов за каждую отметку</Text>
                <Text style={styles.rewardDesc}>
                  Отмечайтесь на остановках и в салоне автобуса, повышайте точность карты и обменивайте баллы на поездки и скидки у партнёров.
                </Text>
              </View>
            </View>

            {/* Close button */}
            <TouchableOpacity style={styles.gotItButton} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.gotItText}>Понятно</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      },
    }),
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
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
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
    gap: 10,
  },
  levelEmoji: {
    fontSize: 16,
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    fontSize: 13,
    fontWeight: '800',
  },
  levelHint: {
    fontSize: 11,
    color: '#64748B',
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 16,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  rewardEmoji: {
    fontSize: 20,
  },
  rewardContent: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  rewardDesc: {
    fontSize: 11,
    lineHeight: 16,
    color: '#B45309',
  },
  gotItButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  gotItText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
