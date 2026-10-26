import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { BrutalBox } from '../components/Brutal';
import { fonts } from '../theme/theme';

// Фоны иконки/тега у карточек наград чередуются

export default function ShopScreen({
  points = 50,
  t,
  theme,
  lang = 'ru',
  onDeductPoints,
}) {
  const [purchasedCode, setPurchasedCode] = useState(null);
  const [errorText, setErrorText] = useState('');

  const rewardsData = [
    {
      id: 'onay_100',
      title: lang === 'kz' ? 'ONAY! картасын толтыру' : lang === 'en' ? 'ONAY! Card Top-up' : 'Пополнение карты ONAY!',
      category: lang === 'kz' ? 'Көлік' : lang === 'en' ? 'Transit' : 'Транспорт',
      desc: lang === 'kz' ? 'ONAY! картасының балансына 100 теңге' : lang === 'en' ? '100 KZT on your ONAY! transit card' : '100 тенге на баланс транспортной карты ONAY!',
      cost: 50,
      code: 'ONAY-BP-9482',
    },
    {
      id: 'free_ride',
      title: lang === 'kz' ? 'Тегін жол жүру' : lang === 'en' ? 'Free Transit Ride' : 'Бесплатная поездка',
      category: lang === 'kz' ? 'Көлік' : lang === 'en' ? 'Transit' : 'Транспорт',
      desc: lang === 'kz' ? 'Автобус немесе троллейбуста 1 рет тегін жүру билеті' : lang === 'en' ? '1 free ticket for bus or trolleybus' : 'Билет на 1 поездку в автобусе или троллейбусе',
      cost: 40,
      code: 'RIDE-FREE-7721',
    },
    {
      id: 'coffee_discount',
      title: lang === 'kz' ? 'Кофеге 20% жеңілдік' : lang === 'en' ? '20% Coffee Discount' : 'Скидка 20% на кофе',
      category: lang === 'kz' ? 'Кафе' : lang === 'en' ? 'Cafe' : 'Кафе и еда',
      desc: lang === 'kz' ? 'Coffee Original желісіндегі кез келген кофеге купон' : lang === 'en' ? 'Coupon for any coffee at Coffee Original' : 'Купон на любой кофейный напиток в сети Coffee Original',
      cost: 30,
      code: 'COFFEE-BOS-20',
    },
    {
      id: 'pharmacy_15',
      title: lang === 'kz' ? 'Дәріханада 15% жеңілдік' : lang === 'en' ? '15% Pharmacy Discount' : 'Скидка 15% в аптеке',
      category: lang === 'kz' ? 'Денсаулық' : lang === 'en' ? 'Health' : 'Здоровье',
      desc: lang === 'kz' ? 'Europharma желісіндегі денсаулық тауарларына жеңілдік' : lang === 'en' ? 'Discount at Europharma pharmacy chain' : 'Скидка на товары для здоровья в сети Europharma',
      cost: 25,
      code: 'PHARMA-15-ALMT',
    },
    {
      id: 'shopper_bag',
      title: lang === 'kz' ? 'BosPa фирмалық сөмкесі' : lang === 'en' ? 'BosPa Branded Tote Bag' : 'Фирменный шоппер BosPa',
      category: lang === 'kz' ? 'Мерч' : lang === 'en' ? 'Merch' : 'Мерч',
      desc: lang === 'kz' ? 'BosPa логотипі бар стильді мақта сөмке' : lang === 'en' ? 'Stylish cotton tote bag with BosPa logo' : 'Стильная хлопковая сумка с логотипом BosPa',
      cost: 120,
      code: 'MERCH-BOSPA-BAG',
    },
  ];

  const handleBuy = (reward) => {
    if (points < reward.cost) {
      setErrorText(`${t.notEnoughError}: ${reward.cost} B, (${points} B)`);
      return;
    }
    setErrorText('');
    onDeductPoints(reward.cost);
    setPurchasedCode({
      reward,
      code: reward.code,
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} showsVerticalScrollIndicator={false}>
      {/* Balance Header */}
      <BrutalBox theme={theme} color={theme.reward} style={styles.balanceWrap} contentStyle={styles.balanceCard}>
        <View style={[styles.balanceHeader, { borderBottomColor: theme.onColor }]}>
          <Text style={[styles.balanceCardLabel, { color: theme.onColor }]}>{t.shopBalanceLabel}</Text>
          <View style={styles.balanceRow}>
            <View style={[styles.coinCircleLarge, { backgroundColor: theme.surface, borderColor: theme.outline }]}>
              <Text style={[styles.coinLetterLarge, { color: theme.text }]}>B</Text>
            </View>
            <Text style={[styles.balanceNum, { color: theme.onColor }]}>{points}</Text>
            <Text style={[styles.balanceUnit, { color: theme.onColor }]}>{t.pointsUnit}</Text>
          </View>
        </View>

        <View style={styles.earningRules}>
          <Text style={[styles.rulesTitle, { color: theme.onColor }]}>{t.howToEarnMore}</Text>
          <View style={styles.ruleItem}>
            <View style={[styles.ruleDot, { backgroundColor: theme.onColor }]} />
            <Text style={[styles.ruleText, { color: theme.onColor }]}>
              {t.earnStopCheckin} <Text style={styles.boldText}>+10 B</Text>
            </Text>
          </View>
          <View style={styles.ruleItem}>
            <View style={[styles.ruleDot, { backgroundColor: theme.onColor }]} />
            <Text style={[styles.ruleText, { color: theme.onColor }]}>
              {t.earnRideCheckin} <Text style={styles.boldText}>+10 B</Text>
            </Text>
          </View>
          <View style={styles.ruleItem}>
            <View style={[styles.ruleDot, { backgroundColor: theme.onColor }]} />
            <Text style={[styles.ruleText, { color: theme.onColor }]}>
              {t.earnFirstDaily} <Text style={styles.boldText}>+15 B</Text>
            </Text>
          </View>
        </View>
      </BrutalBox>

      {errorText.length > 0 && (
        <BrutalBox
          theme={theme}
          color={theme.status[2]}
          radius={14}
          offset={3}
          style={styles.errorWrap}
          contentStyle={styles.errorBanner}
        >
          <Text style={[styles.errorText, { color: theme.onColor }]}>{errorText}</Text>
        </BrutalBox>
      )}

      {/* Rewards Catalog */}
      <View style={styles.catalogSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.catalogTitle}</Text>

        <View style={styles.rewardsList}>
          {rewardsData.map((item) => {
            const canAfford = points >= item.cost;
            return (
              <BrutalBox key={item.id} theme={theme} radius={20} contentStyle={styles.rewardCard}>
                <View style={[styles.rewardCategoryBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.line }]}>
                  <Text style={[styles.rewardCategoryText, { color: theme.textSecondary }]}>
                    {item.category}
                  </Text>
                </View>

                <Text style={[styles.rewardTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.rewardDesc, { color: theme.textSecondary }]}>{item.desc}</Text>

                <View style={[styles.rewardBottomRow, { borderTopColor: theme.line }]}>
                  <View style={styles.priceTag}>
                    <Text style={[styles.priceNum, { color: theme.text }]}>{item.cost}</Text>
                    <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t.pointsUnit}</Text>
                  </View>

                  <BrutalBox
                    theme={theme}
                    color={canAfford ? theme.action : theme.surfaceAlt}
                    radius={14}
                    offset={3}
                    contentStyle={styles.buyBtn}
                    onPress={() => handleBuy(item)}
                  >
                    <Text
                      style={[
                        styles.buyBtnText,
                        { color: canAfford ? theme.onAction : theme.textMuted },
                      ]}
                    >
                      {canAfford ? t.getReward : t.notEnough}
                    </Text>
                  </BrutalBox>
                </View>
              </BrutalBox>
            );
          })}
        </View>
      </View>

      {/* Success Modal */}
      {purchasedCode && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setPurchasedCode(null)}
        >
          <View style={styles.overlay}>
            <BrutalBox theme={theme} radius={24} offset={5} style={styles.successWrap} contentStyle={styles.successModal}>
              <View style={[styles.successBadge, { backgroundColor: theme.reward, borderColor: theme.outline }]}>
                <Text style={[styles.successBadgeText, { color: theme.onColor }]}>
                  {t.successModalBadge}
                </Text>
              </View>
              <Text style={[styles.successTitle, { color: theme.text }]}>{t.promoReceived}</Text>
              <Text style={[styles.successSub, { color: theme.textSecondary }]}>
                {purchasedCode.reward.title}
              </Text>

              <View style={[styles.codeContainer, { backgroundColor: theme.surfaceAlt, borderColor: theme.line }]}>
                <Text style={[styles.codeText, { color: theme.text }]}>{purchasedCode.code}</Text>
              </View>

              <Text style={[styles.codeHint, { color: theme.textMuted }]}>
                {t.promoHint}
              </Text>

              <BrutalBox
                theme={theme}
                color={theme.action}
                radius={16}
                offset={3}
                style={styles.closeModalWrap}
                contentStyle={styles.closeModalBtn}
                onPress={() => setPurchasedCode(null)}
              >
                <Text style={[styles.closeModalBtnText, { color: theme.onAction }]}>{t.doneBtn}</Text>
              </BrutalBox>
            </BrutalBox>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  balanceWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  balanceCard: {
    padding: 18,
  },
  balanceHeader: {
    borderBottomWidth: 2.5,
    paddingBottom: 14,
    marginBottom: 14,
  },
  balanceCardLabel: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  coinCircleLarge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinLetterLarge: {
    fontFamily: fonts.display,
    fontSize: 14,
  },
  balanceNum: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 44,
  },
  balanceUnit: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 15,
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  earningRules: {
    gap: 6,
  },
  rulesTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    marginBottom: 4,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ruleText: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  boldText: {
    fontFamily: fonts.bodyHeavy,
  },
  errorWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  errorBanner: {
    padding: 12,
  },
  errorText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  catalogSection: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    marginBottom: 14,
  },
  rewardsList: {
    gap: 14,
  },
  rewardCard: {
    padding: 16,
  },
  rewardCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 2,
    marginBottom: 10,
  },
  rewardCategoryText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  rewardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    lineHeight: 21,
  },
  rewardDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
    marginBottom: 14,
  },
  rewardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    paddingTop: 12,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceNum: {
    fontFamily: fonts.display,
    fontSize: 22,
  },
  priceLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  buyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buyBtnText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 17, 17, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successWrap: {
    width: '100%',
    maxWidth: 380,
  },
  successModal: {
    padding: 22,
    alignItems: 'center',
  },
  successBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    marginBottom: 12,
  },
  successBadgeText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  successTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    marginBottom: 4,
  },
  successSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  codeContainer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2.5,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  codeText: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 1.5,
  },
  codeHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
  },
  closeModalWrap: {
    alignSelf: 'stretch',
  },
  closeModalBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 16,
  },
});
