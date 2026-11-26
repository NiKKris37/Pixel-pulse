import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { glow } from './theme';
import { styles } from './styles';

export const haptic = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

// Constante : évite de relancer l'animation à chaque rendu
const WAVE_EASING = Easing.inOut(Easing.ease);

function useLoop(duration, easing = Easing.linear) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [value, duration, easing]);
  return value;
}

export function BatteryRing({ level, color, charging, accents }) {
  const spin = useLoop(charging ? 1600 : 5000);
  const wave = useLoop(2400, WAVE_EASING);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const reverse = spin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const scale = wave.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.96, 1.05, 0.96] });
  const opacity = wave.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.9, 0.35] });

  return (
    <View style={styles.ringBox}>
      <Animated.View
        style={[styles.halo, {
          borderColor: color,
          boxShadow: `0px 0px 40px 4px ${color}`,
          opacity,
          transform: [{ scale }],
        }]}
      />
      <Animated.View
        style={[styles.arc, {
          borderTopColor: color,
          borderRightColor: color,
          transform: [{ rotate }],
        }]}
      />
      <Animated.View
        style={[styles.arcInner, {
          borderBottomColor: accents.main,
          borderLeftColor: accents.third,
          transform: [{ rotate: reverse }],
        }]}
      />
      <Text style={[styles.percent, glow(color)]}>
        {level === null ? '--' : level}
        <Text style={styles.percentSign}> %</Text>
      </Text>
    </View>
  );
}

export function Card({ title, color, delay, children }) {
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, delay, useNativeDriver: true }).start();
  }, [enter, delay]);
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <Animated.View
      style={[styles.card, {
        borderColor: color,
        boxShadow: `0px 0px 14px 0px ${color}66`,
        opacity: enter,
        transform: [{ translateY }],
      }]}
    >
      <Text style={[styles.cardTitle, { color }, glow(color)]}>{title}</Text>
      {children}
    </Animated.View>
  );
}

export function Bar({ ratio, color }) {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: ratio,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // la largeur ne passe pas par le pilote natif
    }).start();
  }, [width, ratio]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[styles.fill, {
          backgroundColor: color,
          boxShadow: `0px 0px 12px 1px ${color}`,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]}
      />
    </View>
  );
}

export function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function Header({ title, color, onBack }) {
  return (
    <>
      <Pressable onPress={onBack} accessibilityRole="button">
        <Text style={styles.back}>‹ Retour</Text>
      </Pressable>
      <Text style={[styles.title, glow(color), { fontSize: 22, letterSpacing: 3 }]}>{title}</Text>
    </>
  );
}

export function NeonButton({ label, color, onPress, wide, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40 }).start();

  return (
    <Pressable
      style={wide ? styles.buttonWide : styles.buttonSlot}
      disabled={disabled}
      onPressIn={() => press(0.92)}
      onPressOut={() => press(1)}
      onPress={() => { haptic(); onPress(); }}
      accessibilityRole="button"
    >
      <Animated.View
        style={[styles.button, {
          borderColor: color,
          boxShadow: `0px 0px 12px 0px ${color}88`,
          opacity: disabled ? 0.35 : 1,
          transform: [{ scale }],
        }]}
      >
        <Text style={[styles.buttonText, glow(color)]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}
