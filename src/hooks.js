import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Battery from 'expo-battery';
import { File, Paths } from 'expo-file-system';
import PixelInfo from '../modules/pixel-info';
import { addSample, dischargeRate } from './history';

const historyFile = () => new File(Paths.document, 'battery.json');

function loadHistory() {
  try {
    const file = historyFile();
    const data = file.exists ? JSON.parse(file.textSync()) : [];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('Historique illisible', e);
    return [];
  }
}

export function useBattery() {
  const [data, setData] = useState({
    level: null, state: null, saver: false, rate: null, history: [], details: null,
  });
  const history = useRef(null);

  const read = useCallback(async () => {
    try {
      const p = await Battery.getPowerStateAsync();
      const level = p.batteryLevel >= 0 ? Math.round(p.batteryLevel * 100) : null;
      history.current ??= loadHistory();

      if (level !== null && p.batteryState !== Battery.BatteryState.UNKNOWN) {
        const plugged = p.batteryState !== Battery.BatteryState.UNPLUGGED;
        const next = addSample(history.current, { t: Date.now(), level, plugged });
        if (next !== history.current) {
          history.current = next;
          try {
            await historyFile().write(JSON.stringify(next));
          } catch (e) {
            console.warn('Historique non enregistré', e);
          }
        }
      }

      let details = null;
      try {
        details = PixelInfo?.getBattery() ?? null;
        PixelInfo?.updateWidgets();
      } catch (e) {
        console.warn('Détails de batterie indisponibles', e);
      }

      setData({
        level,
        state: p.batteryState,
        saver: p.lowPowerMode,
        rate: dischargeRate(history.current),
        history: history.current,
        details,
      });
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

export function useStorage(refreshKey) {
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
  }, [refreshKey]);

  return data;
}
