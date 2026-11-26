import { useCallback, useState } from 'react';
import { File, Paths } from 'expo-file-system';

export const NEON = {
  cyan: '#00f0ff',
  pink: '#ff2bd6',
  green: '#39ff88',
  yellow: '#ffe43b',
  red: '#ff3b5c',
  violet: '#a66bff',
  orange: '#ff9d2e',
  blue: '#3b8cff',
};

export const THEMES = {
  synthwave: { name: 'Synthwave', main: NEON.pink, second: NEON.cyan, third: NEON.violet },
  ocean: { name: 'Océan', main: NEON.cyan, second: NEON.blue, third: NEON.green },
  matrix: { name: 'Matrix', main: NEON.green, second: '#b6ff3b', third: '#00ffc3' },
  lave: { name: 'Lave', main: NEON.orange, second: NEON.yellow, third: NEON.red },
};

export const glow = (color) => ({
  textShadowColor: color,
  textShadowRadius: 14,
  textShadowOffset: { width: 0, height: 0 },
});

const prefs = () => new File(Paths.document, 'prefs.json');

function loadThemeKey() {
  try {
    const file = prefs();
    if (file.exists) {
      const { theme } = JSON.parse(file.textSync());
      if (THEMES[theme]) return theme;
    }
  } catch (e) {
    console.warn('Préférences illisibles', e);
  }
  return 'synthwave';
}

export function useTheme() {
  const [key, setKey] = useState(loadThemeKey);
  const choose = useCallback(async (next) => {
    setKey(next);
    try {
      await prefs().write(JSON.stringify({ theme: next }));
    } catch (e) {
      console.warn('Préférences non enregistrées', e);
    }
  }, []);
  return [THEMES[key], key, choose];
}
