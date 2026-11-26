import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as Network from 'expo-network';
import { median } from './history';
import { glow } from './theme';
import { Card, Header, NeonButton, Row } from './ui';
import { styles } from './styles';

// Serveur public de test de débit de Cloudflare
const URL_BASE = 'https://speed.cloudflare.com/__down?bytes=';
const SIZE = 10_000_000;

async function timed(bytes, signal) {
  const start = performance.now();
  const response = await fetch(`${URL_BASE}${bytes}&r=${Math.random()}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.arrayBuffer();
  if (data.byteLength < bytes) throw new Error('Réponse incomplète');
  return performance.now() - start;
}

// Fait défiler le chiffre jusqu'à sa valeur
function Counter({ value, color }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (value === null) { setShown(0); return undefined; }
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setShown(value * (1 - (1 - step / 30) ** 3));
      if (step >= 30) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return (
    <Text style={[styles.bigNumber, glow(color)]}>
      {value === null ? '--' : shown.toFixed(1).replace('.', ',')}
    </Text>
  );
}

export default function SpeedTest({ theme, onBack }) {
  const [status, setStatus] = useState('idle'); // idle | ping | download | done | error
  const [ping, setPing] = useState(null);
  const [speed, setSpeed] = useState(null);
  const network = Network.useNetworkState();
  const controller = useRef(null);

  useEffect(() => () => controller.current?.abort(), []);

  const start = async () => {
    const current = new AbortController();
    controller.current = current;
    const limit = setTimeout(() => current.abort(), 45000);
    setPing(null);
    setSpeed(null);
    try {
      setStatus('ping');
      await timed(0, current.signal); // première connexion, non comptée
      const times = [];
      for (let i = 0; i < 5; i += 1) times.push(await timed(0, current.signal));
      setPing(Math.round(median(times)));
      setStatus('download');
      const ms = await timed(SIZE, current.signal);
      setSpeed((SIZE * 8) / (ms / 1000) / 1e6);
      setStatus('done');
    } catch (e) {
      console.warn('Test de connexion impossible', e);
      setStatus('error');
    } finally {
      clearTimeout(limit);
    }
  };

  const running = status === 'ping' || status === 'download';
  const label = {
    idle: 'Prêt', ping: 'Mesure de la latence…', download: 'Téléchargement…',
    done: 'Test terminé', error: 'Test impossible : vérifie la connexion',
  }[status];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Header title="CONNEXION" color={theme.main} onBack={onBack} />
      <View style={{ height: 20 }} />
      <Card title="DÉBIT DESCENDANT" color={theme.main} delay={50}>
        <Counter value={speed} color={theme.main} />
        <Text style={styles.unit}>Mb/s</Text>
        <Row label="Latence" value={ping === null ? '…' : `${ping} ms`} />
        <Row label="État" value={label} />
      </Card>
      <NeonButton wide label="LANCER LE TEST" color={theme.second} disabled={running} onPress={start} />
      <Text style={styles.note}>
        Chaque test télécharge environ 10 Mo depuis Cloudflare.
        {network.type === 'CELLULAR' ? ' Tu es en données mobiles.' : ''}
      </Text>
    </ScrollView>
  );
}
