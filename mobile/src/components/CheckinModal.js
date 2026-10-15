import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';

export default function CheckinModal({
  visible,
  target,
  t,
  theme,
  onClose,
  onSubmit,
}) {
  const [selectedLevel, setSelectedLevel] = useState(0);

  if (!visible) return null;

  const levelsList = [
    { id: 0, badge: t.level0Badge, hint: t.level0Hint, color: '#10B981', bg: theme.isDark ? '#064E3B' : '#D1FAE5' },
    { id: 1, badge: t.level1Badge, hint: t.level1Hint, color: '#F59E0B', bg: theme.isDark ? '#451A03' : '#FEF3C7' },
    { id: 2, badge: t.level2Badge, hint: t.level2Hint, color: '#EF4444', bg: theme.isDark ? '#450A0A' : '#FEE2E2' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={[styles.title, { color: theme.text }]}>{t.checkinModalTitle}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {target?.name || ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.closeText, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            {levelsList.map((lvl) => {
              const isSelected = selectedLevel === lvl.id;
              return (
                <TouchableOpacity
                  key={lvl.id}
                  style={[
                    styles.optionCard,
                    { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                    isSelected && { borderColor: lvl.color, backgroundColor: lvl.bg },
                  ]}
                  onPress={() => setSelectedLevel(lvl.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statusDotLarge, { backgroundColor: lvl.color }]} />
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionTitle,
                        { color: theme.text },
                        isSelected && { color: lvl.color },
                      ]}
                    >
                      {lvl.badge}
                    </Text>
                    <Text style={[styles.optionHint, { color: theme.textSecondary }]}>{lvl.hint}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      { borderColor: theme.textMuted },
                      isSelected && { borderColor: lvl.color, backgroundColor: lvl.color },
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reward notice */}
          <View style={[styles.rewardBanner, { backgroundColor: theme.coinBg, borderColor: theme.coinBorder }]}>
            <View style={[styles.rewardIconBadge, { backgroundColor: theme.coin }]}>
              <Text style={styles.rewardIconText}>B</Text>
            </View>
            <Text style={[styles.rewardText, { color: theme.isDark ? '#FDE68A' : '#92400E' }]}>
              {t.checkinRewardNote} <Text style={styles.boldText}>{t.checkinRewardPoints}</Text> BosPa
            </Text>
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={() => onSubmit(selectedLevel)}
            activeOpacity={0.8}
          >
            <Text style={styles.submitText}>{t.sendCheckin}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleWrap: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 2,
    gap: 12,
  },
  statusDotLarge: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  optionHint: {
    fontSize: 11,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  rewardIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  rewardText: {
    fontSize: 12,
    flex: 1,
  },
  boldText: {
    fontWeight: '800',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
