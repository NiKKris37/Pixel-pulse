import { Pressable, ScrollView, Text, ToastAndroid, View } from 'react-native';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Network from 'expo-network';
import PixelInfo from '../modules/pixel-info';
import { toGB } from './files';
import { useStorage } from './hooks';
import { glow, NEON, THEMES } from './theme';
import { Bar, BatteryRing, Card, haptic, NeonButton, Row } from './ui';
import { styles } from './styles';

const SHORTCUTS = [
  ['Batterie', 'android.intent.action.POWER_USAGE_SUMMARY'],
  ['Économiseur', 'android.settings.BATTERY_SAVER_SETTINGS'],
  ['Stockage', 'android.settings.INTERNAL_STORAGE_SETTINGS'],
  ['Applications', 'android.settings.APPLICATION_SETTINGS'],
  ['Wi-Fi', 'android.settings.WIFI_SETTINGS'],
  ['Écran', 'android.settings.DISPLAY_SETTINGS'],
];

const NETWORKS = { WIFI: 'Wi-Fi', CELLULAR: 'Mobile', ETHERNET: 'Ethernet', VPN: 'VPN', NONE: 'Aucun' };

const HEALTH = {
  good: 'Bonne', overheat: 'Surchauffe', dead: 'Hors service',
  overVoltage: 'Surtension', cold: 'Trop froide', failure: 'Défaillance',
};

const addWidget = () => {
  if (!PixelInfo?.requestPinWidget()) {
    ToastAndroid.show('Ajoute-le depuis la liste des widgets de ton écran d\'accueil', ToastAndroid.LONG);
  }
};

const openSetting = async (action) => {
  try {
    await IntentLauncher.startActivityAsync(action);
  } catch (e) {
    ToastAndroid.show('Réglage indisponible sur ce téléphone', ToastAndroid.SHORT);
  }
};

export default function Dashboard({ battery, theme, themeKey, onTheme, onOpen }) {
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

  const details = battery.details;
  const hot = details?.temperature >= 40;

  let estimate = 'Pas sur batterie';
  if (battery.state === Battery.BatteryState.UNPLUGGED) {
    estimate = battery.rate > 0
      ? `${battery.rate.toFixed(1).replace('.', ',')} %/h · reste ~${Math.round(battery.level / battery.rate)} h`
      : 'Mesure en cours…';
  }

  const usedRatio = storage ? storage.used / storage.total : 0;
  const accents = [theme.main, theme.second, theme.third];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, glow(theme.main)]}>PIXEL PULSE</Text>
      <Text style={styles.subtitle}>
        {Device.modelName ?? 'Android'} · Android {Device.osVersion ?? '?'}
      </Text>

      <BatteryRing level={battery.level} color={color} charging={charging} accents={theme} />

      <Card title="BATTERIE" color={color} delay={100}>
        <Row label="État" value={stateLabel} />
        <Row label="Économiseur" value={battery.saver ? 'Activé' : 'Désactivé'} />
        <Row label="Décharge" value={estimate} />
        {details?.temperature != null && (
          <Row label="Température" value={`${details.temperature.toFixed(1).replace('.', ',')} °C`} />
        )}
        {details?.health && <Row label="Santé" value={HEALTH[details.health] ?? 'Inconnue'} />}
        {details?.cycles != null && <Row label="Cycles de charge" value={String(details.cycles)} />}
        {hot && <Text style={styles.warning}>Batterie chaude : laisse le téléphone refroidir.</Text>}
        <View style={styles.cardAction}>
          <NeonButton wide label="HISTORIQUE" color={color} onPress={() => onOpen('history')} />
        </View>
      </Card>

      <Card title="STOCKAGE" color={theme.main} delay={200}>
        <Bar ratio={usedRatio} color={usedRatio > 0.85 ? NEON.red : theme.main} />
        <Row label="Libre" value={storage ? `${toGB(storage.free)} Go` : '…'} />
        <Row label="Total accessible" value={storage ? `${toGB(storage.total)} Go` : '…'} />
        {usedRatio > 0.85 && (
          <Text style={styles.warning}>Stockage presque plein : pense à faire du tri.</Text>
        )}
        <View style={styles.cardAction}>
          <NeonButton wide label="GRAND MÉNAGE" color={theme.main} onPress={() => onOpen('cleanup')} />
        </View>
      </Card>

      <Card title="SYSTÈME" color={theme.second} delay={300}>
        <Row label="Réseau" value={NETWORKS[network.type] ?? '…'} />
        <Row
          label="Internet"
          value={network.isInternetReachable == null ? '…' : network.isInternetReachable ? 'OK' : 'Hors ligne'}
        />
        <Row label="Mémoire vive" value={Device.totalMemory ? `${toGB(Device.totalMemory)} Go` : '?'} />
        <View style={styles.cardAction}>
          <NeonButton wide label="TEST DE CONNEXION" color={theme.second} onPress={() => onOpen('speed')} />
        </View>
      </Card>

      <Card title="RACCOURCIS" color={theme.third} delay={400}>
        <View style={styles.grid}>
          {SHORTCUTS.map(([label, action], i) => (
            <NeonButton key={label} label={label} color={accents[i % 3]} onPress={() => openSetting(action)} />
          ))}
        </View>
      </Card>

      <Card title="WIDGET" color={theme.second} delay={450}>
        <Text style={styles.label}>Batterie et stockage directement sur l'écran d'accueil.</Text>
        <View style={styles.cardAction}>
          <NeonButton wide label="AJOUTER LE WIDGET" color={theme.second} onPress={addWidget} />
        </View>
      </Card>

      <Card title="COULEURS" color={theme.main} delay={500}>
        <View style={styles.swatches}>
          {Object.entries(THEMES).map(([key, t]) => (
            <Pressable
              key={key}
              style={styles.swatchSlot}
              onPress={() => { haptic(); onTheme(key); }}
              accessibilityRole="button"
              accessibilityState={{ selected: key === themeKey }}
            >
              <View
                style={[styles.swatch, {
                  borderColor: t.main,
                  backgroundColor: key === themeKey ? t.second : '#000',
                  boxShadow: `0px 0px 14px 1px ${t.main}`,
                }]}
              />
              <Text style={[styles.swatchName, key === themeKey && { color: '#fff' }]}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.note}>Thème : {THEMES[themeKey].name}</Text>
      </Card>
    </ScrollView>
  );
}
