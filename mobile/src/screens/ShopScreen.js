import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';

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
      <View style={[styles.balanceCard, { backgroundColor: theme.primaryDark }]}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceCardLabel}>{t.shopBalanceLabel}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.coinCircleLarge}>
              <Text style={styles.coinLetterLarge}>B</Text>
            </View>
            <Text style={styles.balanceNum}>{points}</Text>
            <Text style={styles.balanceUnit}>{t.pointsUnit}</Text>
          </View>
        </View>

        <View style={styles.earningRules}>
          <Text style={styles.rulesTitle}>{t.howToEarnMore}</Text>
          <View style={styles.ruleItem}>
            <View style={styles.ruleDot} />
            <Text style={styles.ruleText}>
              {t.earnStopCheckin} <Text style={styles.boldText}>+10 B</Text>
            </Text>
          </View>
          <View style={styles.ruleItem}>
            <View style={styles.ruleDot} />
            <Text style={styles.ruleText}>
              {t.earnRideCheckin} <Text style={styles.boldText}>+10 B</Text>
            </Text>
          </View>
          <View style={styles.ruleItem}>
            <View style={styles.ruleDot} />
            <Text style={styles.ruleText}>
              {t.earnFirstDaily} <Text style={styles.boldText}>+15 B</Text>
            </Text>
          </View>
        </View>
      </View>

      {errorText.length > 0 && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      )}

      {/* Rewards Catalog */}
      <View style={styles.catalogSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.catalogTitle}</Text>

        <View style={styles.rewardsList}>
          {rewardsData.map((item) => {
            const canAfford = points >= item.cost;
            return (
              <View
                key={item.id}
                style={[
                  styles.rewardCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={[styles.rewardCategoryBadge, { backgroundColor: theme.cardSecondary }]}>
                  <Text style={[styles.rewardCategoryText, { color: theme.textSecondary }]}>
                    {item.category}
                  </Text>
                </View>

                <Text style={[styles.rewardTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.rewardDesc, { color: theme.textSecondary }]}>{item.desc}</Text>

                <View style={[styles.rewardBottomRow, { borderTopColor: theme.border }]}>
                  <View style={styles.priceTag}>
                    <Text style={[styles.priceNum, { color: theme.coin }]}>{item.cost}</Text>
                    <Text style={[styles.priceLabel, { color: theme.coin }]}>{t.pointsUnit}</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.buyBtn,
                      canAfford ? { backgroundColor: theme.primary } : { backgroundColor: theme.cardSecondary },
                    ]}
                    onPress={() => handleBuy(item)}
                    activeOpacity={canAfford ? 0.7 : 1}
                  >
                    <Text
                      style={[
                        styles.buyBtnText,
                        canAfford ? { color: '#FFFFFF' } : { color: theme.textMuted },
                      ]}
                    >
                      {canAfford ? t.getReward : t.notEnough}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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
            <View style={[styles.successModal, { backgroundColor: theme.card }]}>
              <View style={[styles.successBadge, { backgroundColor: theme.primaryBg }]}>
                <Text style={[styles.successBadgeText, { color: theme.primary }]}>
                  {t.successModalBadge}
                </Text>
              </View>
              <Text style={[styles.successTitle, { color: theme.text }]}>{t.promoReceived}</Text>
              <Text style={[styles.successSub, { color: theme.textSecondary }]}>
                {purchasedCode.reward.title}
              </Text>

              <View style={[styles.codeContainer, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <Text style={[styles.codeText, { color: theme.text }]}>{purchasedCode.code}</Text>
              </View>

              <Text style={[styles.codeHint, { color: theme.textMuted }]}>
                {t.promoHint}
              </Text>

              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: theme.primary }]}
                onPress={() => setPurchasedCode(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.closeModalBtnText}>{t.doneBtn}</Text>
              </TouchableOpacity>
            </View>
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
  balanceCard: {
    margin: 20,
    borderRadius: 24,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#047857',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 6px 20px rgba(4,120,87,0.25)',
      },
    }),
  },
  balanceHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    paddingBottom: 16,
    marginBottom: 16,
  },
  balanceCardLabel: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '700',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinLetterLarge: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  balanceNum: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  balanceUnit: {
    color: '#D1FAE5',
    fontSize: 15,
    fontWeight: '700',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  earningRules: {
    gap: 6,
  },
  rulesTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34D399',
  },
  ruleText: {
    color: '#ECFDF5',
    fontSize: 12,
  },
  boldText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  catalogSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },
  rewardsList: {
    gap: 12,
  },
  rewardCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
      },
    }),
  },
  rewardCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  rewardCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  rewardDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
    marginBottom: 14,
  },
  rewardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  buyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
  },
  buyBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  successBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  successBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  successSub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  codeContainer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  codeHint: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  },
  closeModalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
