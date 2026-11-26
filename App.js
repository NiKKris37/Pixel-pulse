import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Cleanup from './src/Cleanup';
import Dashboard from './src/Dashboard';
import History from './src/HistoryScreen';
import SpeedTest from './src/SpeedTest';
import { useBattery } from './src/hooks';
import { useTheme } from './src/theme';
import { styles } from './src/styles';

function Root() {
  const [screen, setScreen] = useState('home');
  const [theme, themeKey, setTheme] = useTheme();
  const battery = useBattery(); // ici pour garder la mesure d'un écran à l'autre

  const home = () => setScreen('home');

  // Le bouton Retour d'Android revient à l'accueil
  useEffect(() => {
    if (screen === 'home') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setScreen('home');
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      {screen === 'home' && (
        <Dashboard
          battery={battery}
          theme={theme}
          themeKey={themeKey}
          onTheme={setTheme}
          onOpen={setScreen}
        />
      )}
      {screen === 'cleanup' && <Cleanup theme={theme} onBack={home} />}
      {screen === 'history' && <History battery={battery} theme={theme} onBack={home} />}
      {screen === 'speed' && <SpeedTest theme={theme} onBack={home} />}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}
