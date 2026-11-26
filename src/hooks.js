import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Battery from 'expo-battery';
import { Paths } from 'expo-file-system';

export function useBattery() {
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
