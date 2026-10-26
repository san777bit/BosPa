import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { BrutalBox } from './Brutal';
import { fonts, statusColor } from '../theme/theme';

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
    { id: 0, badge: t.level0Badge, hint: t.level0Hint, color: statusColor(theme, 0) },
    { id: 1, badge: t.level1Badge, hint: t.level1Hint, color: statusColor(theme, 1) },
    { id: 2, badge: t.level2Badge, hint: t.level2Hint, color: statusColor(theme, 2) },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BrutalBox theme={theme} radius={24} offset={5} style={styles.modalWrap} contentStyle={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={[styles.title, { color: theme.text }]}>{t.checkinModalTitle}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {target?.name || ''}
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

          {/* Options */}
          <View style={styles.optionsList}>
            {levelsList.map((lvl) => {
              const isSelected = selectedLevel === lvl.id;
              return (
                <BrutalBox
                  key={lvl.id}
                  theme={theme}
                  radius={16}
                  offset={3}
                  color={isSelected ? lvl.color : theme.surface}
                  contentStyle={styles.optionCard}
                  onPress={() => setSelectedLevel(lvl.id)}
                >
                  <View style={[styles.statusDotLarge, { backgroundColor: lvl.color, borderColor: theme.outline }]} />
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionTitle,
                        { color: isSelected ? theme.onColor : theme.text },
                      ]}
                    >
                      {lvl.badge}
                    </Text>
                    <Text
                      style={[
                        styles.optionHint,
                        { color: isSelected ? theme.onColor : theme.textSecondary },
                      ]}
                    >
                      {lvl.hint}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? theme.onColor : theme.textMuted,
                        backgroundColor: isSelected ? theme.onColor : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: lvl.color }]} />}
                  </View>
                </BrutalBox>
              );
            })}
          </View>

          {/* Reward notice */}
          <BrutalBox
            theme={theme}
            radius={14}
            offset={3}
            color={theme.reward}
            style={styles.rewardWrap}
            contentStyle={styles.rewardBanner}
          >
            <View style={[styles.rewardIconBadge, { backgroundColor: theme.reward, borderColor: theme.onColor }]}>
              <Text style={[styles.rewardIconText, { color: theme.onColor }]}>B</Text>
            </View>
            <Text style={[styles.rewardText, { color: theme.onColor }]}>
              {t.checkinRewardNote} <Text style={styles.boldText}>{t.checkinRewardPoints}</Text> BosPa
            </Text>
          </BrutalBox>

          {/* Submit button */}
          <BrutalBox
            theme={theme}
            color={theme.action}
            radius={16}
            offset={3}
            contentStyle={styles.submitButton}
            onPress={() => onSubmit(selectedLevel)}
          >
            <Text style={[styles.submitText, { color: theme.onAction }]}>{t.sendCheckin}</Text>
          </BrutalBox>
        </BrutalBox>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalWrap: {
    width: '100%',
    maxWidth: 400,
  },
  modal: {
    padding: 20,
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
    fontFamily: fonts.display,
    fontSize: 18,
  },
  subtitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
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
  optionsList: {
    gap: 8,
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  statusDotLarge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 16,
  },
  optionHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rewardWrap: {
    marginBottom: 12,
  },
  rewardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  rewardIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconText: {
    fontFamily: fonts.display,
    fontSize: 11,
  },
  rewardText: {
    fontFamily: fonts.body,
    fontSize: 13,
    flex: 1,
  },
  boldText: {
    fontFamily: fonts.bodyHeavy,
  },
  submitButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 16,
  },
});
