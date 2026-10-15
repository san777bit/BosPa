import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { Colors } from '../theme/colors';

export default function RewardToast({ message, points = 10, visible, onHide }) {
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
      <View style={styles.toastCard}>
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>+B</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>+{points} баллов BosPa</Text>
          <Text style={styles.desc}>{message}</Text>
        </View>
      </View>
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
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#059669',
    ...Platform.select({
      ios: {
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 20px rgba(5,150,105,0.35)',
      },
    }),
  },
  badgeWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.white,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: '#ECFDF5',
    fontSize: 14,
    fontWeight: '800',
  },
  desc: {
    color: '#A7F3D0',
    fontSize: 11,
    marginTop: 1,
  },
});
