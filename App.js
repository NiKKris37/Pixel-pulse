import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, AppState, Easing, Pressable, ScrollView,
  StyleSheet, Text, ToastAndroid, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Network from 'expo-network';
import { Paths } from 'expo-file-system';

const NEON = {
  cyan: '#00f0ff',
  pink: '#ff2bd6',
  green: '#39ff88',
  yellow: '#ffe43b',
  red: '#ff3b5c',
  violet: '#a66bff',
};

const GB = 1e9; // Go décimaux, comme sur les fiches techniques
const toGB = (bytes) => (bytes / GB).toFixed(1).replace('.', ',');

const glow = (color) => ({
  textShadowColor: color,
  textShadowRadius: 14,
  textShadowOffset: { width: 0, height: 0 },
});

/* ---------- Données ---------- */

function useBattery() {
  const [data, setData] = useState({ level: null, state: null, saver: false, rate: null });
  const last = useRef(null);   // dernier niveau lu
  const anchor = useRef(null); // première baisse observée

  const read = useCallback(async () => {
    try {
      const p = await Battery.getPowerStateAsync();
      const level = p.batteryLevel >= 0 ? Math.round(p.batteryLevel * 100) : null;
      let rate = null;

      if (p.batteryState === Battery.BatteryState.UNPLUGGED && level !== null) {
        const now = Date.now();
        if (last.current !== null && level < last.current) {
          if (!anchor.current) {
            anchor.current = { level, time: now };
          } else {
            const hours = (now - anchor.current.time) / 3600000;
            if (hours > 0) rate = (anchor.current.level - level) / hours;
          }
        }
        last.current = level;
      } else {
        last.current = null;
        anchor.current = null;
      }

      setData((old) => ({
        level,
        state: p.batteryState,
        saver: p.lowPowerMode,
        // on garde la dernière estimation tant qu'on reste sur batterie
        rate: anchor.current ? (rate ?? old.rate) : null,
      }));
    } catch (e) {
      console.warn('Batterie indisponible', e);
    }
  }, []);

  useEffect(() => {
    read();
    // Sur Android, l'écouteur de niveau est rare : on relit régulièrement
    const timer = setInterval(read, 15000);
    const subs = [
      Battery.addBatteryStateListener(read),
      Battery.addLowPowerModeListener(read),
      AppState.addEventListener('change', (s) => s === 'active' && read()),
    ];
    return () => {
      clearInterval(timer);
      subs.forEach((s) => s.remove());
    };
  }, [read]);

  return data;
}

function useStorage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const read = () => {
      try {
        const total = Paths.totalDiskSpace;
        const free = Paths.availableDiskSpace;
        if (total > 0) setData({ total, free, used: total - free });
      } catch (e) {
        console.warn('Stockage indisponible', e);
      }
    };
    read();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && read());
    return () => sub.remove();
  }, []);

  return data;
}

/* ---------- Composants animés ---------- */

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

function BatteryRing({ level, color, charging }) {
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
          borderBottomColor: NEON.pink,
          borderLeftColor: NEON.violet,
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

function Card({ title, color, delay, children }) {
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

function Bar({ ratio, color }) {
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

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function NeonButton({ label, color, action }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40 }).start();

  const open = async () => {
    try {
      await IntentLauncher.startActivityAsync(action);
    } catch (e) {
      ToastAndroid.show('Réglage indisponible sur ce téléphone', ToastAndroid.SHORT);
    }
  };

  return (
    <Pressable
      style={styles.buttonSlot}
      onPressIn={() => press(0.92)}
      onPressOut={() => press(1)}
      onPress={open}
      accessibilityRole="button"
    >
      <Animated.View
        style={[styles.button, {
          borderColor: color,
          boxShadow: `0px 0px 12px 0px ${color}88`,
          transform: [{ scale }],
        }]}
      >
        <Text style={[styles.buttonText, glow(color)]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ---------- Écran principal ---------- */

const SHORTCUTS = [
  ['Batterie', NEON.green, 'android.intent.action.POWER_USAGE_SUMMARY'],
  ['Économiseur', NEON.yellow, 'android.settings.BATTERY_SAVER_SETTINGS'],
  ['Stockage', NEON.pink, 'android.settings.INTERNAL_STORAGE_SETTINGS'],
  ['Applications', NEON.violet, 'android.settings.APPLICATION_SETTINGS'],
  ['Wi-Fi', NEON.cyan, 'android.settings.WIFI_SETTINGS'],
  ['Écran', NEON.yellow, 'android.settings.DISPLAY_SETTINGS'],
];

const NETWORKS = { WIFI: 'Wi-Fi', CELLULAR: 'Mobile', ETHERNET: 'Ethernet', VPN: 'VPN', NONE: 'Aucun' };

function Dashboard() {
  const battery = useBattery();
  const storage = useStorage();
  const network = Network.useNetworkState();

  const charging = battery.state === Battery.BatteryState.CHARGING;
  const color =
    charging ? NEON.cyan
    : battery.level === null || battery.level > 50 ? NEON.green
    : battery.level > 20 ? NEON.yellow
    : NEON.red;

  const stateLabel = {
    [Battery.BatteryState.CHARGING]: 'En charge',
    [Battery.BatteryState.FULL]: 'Pleine',
    [Battery.BatteryState.UNPLUGGED]: 'Sur batterie',
    [Battery.BatteryState.NOT_CHARGING]: 'Branché, charge en pause',
  }[battery.state] ?? 'Inconnu';

  let estimate = 'Pas sur batterie';
  if (battery.state === Battery.BatteryState.UNPLUGGED) {
    estimate = battery.rate > 0
      ? `${battery.rate.toFixed(1).replace('.', ',')} %/h · reste ~${Math.round(battery.level / battery.rate)} h`
      : 'Mesure en cours…';
  }

  const usedRatio = storage ? storage.used / storage.total : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, glow(NEON.pink)]}>PIXEL PULSE</Text>
        <Text style={styles.subtitle}>
          {Device.modelName ?? 'Android'} · Android {Device.osVersion ?? '?'}
        </Text>

        <BatteryRing level={battery.level} color={color} charging={charging} />

        <Card title="BATTERIE" color={color} delay={100}>
          <Row label="État" value={stateLabel} />
          <Row label="Économiseur" value={battery.saver ? 'Activé' : 'Désactivé'} />
          <Row label="Décharge" value={estimate} />
        </Card>

        <Card title="STOCKAGE" color={NEON.pink} delay={250}>
          <Bar ratio={usedRatio} color={usedRatio > 0.85 ? NEON.red : NEON.pink} />
          <Row label="Libre" value={storage ? `${toGB(storage.free)} Go` : '…'} />
          <Row label="Total accessible" value={storage ? `${toGB(storage.total)} Go` : '…'} />
          {usedRatio > 0.85 && (
            <Text style={styles.warning}>Stockage presque plein : pense à faire du tri.</Text>
          )}
        </Card>

        <Card title="SYSTÈME" color={NEON.cyan} delay={400}>
          <Row label="Réseau" value={NETWORKS[network.type] ?? '…'} />
          <Row
            label="Internet"
            value={network.isInternetReachable == null ? '…' : network.isInternetReachable ? 'OK' : 'Hors ligne'}
          />
          <Row
            label="Mémoire vive"
            value={Device.totalMemory ? `${toGB(Device.totalMemory)} Go` : '?'}
          />
        </Card>

        <Card title="RACCOURCIS" color={NEON.violet} delay={550}>
          <View style={styles.grid}>
            {SHORTCUTS.map(([label, c, action]) => (
              <NeonButton key={label} label={label} color={c} action={action} />
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Dashboard />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  subtitle: { color: '#8b93a7', textAlign: 'center', marginTop: 4 },

  ringBox: { width: 240, height: 240, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  halo: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2 },
  arc: { position: 'absolute', width: 228, height: 228, borderRadius: 114, borderWidth: 5, borderColor: 'transparent' },
  arcInner: { position: 'absolute', width: 176, height: 176, borderRadius: 88, borderWidth: 3, borderColor: 'transparent' },
  percent: { color: '#fff', fontSize: 60, fontWeight: '200' },
  percentSign: { fontSize: 24 },

  card: { backgroundColor: '#05060a', borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 18 },
  cardTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 3, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  label: { color: '#8b93a7', fontSize: 15 },
  value: { color: '#fff', fontSize: 15, flexShrink: 1, textAlign: 'right' },
  warning: { color: NEON.red, marginTop: 8 },

  track: { height: 10, borderRadius: 5, backgroundColor: '#171a24', marginVertical: 10 },
  fill: { height: 10, borderRadius: 5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14, marginTop: 6 },
  buttonSlot: { width: '47%' },
  button: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#000' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
