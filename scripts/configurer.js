// Complète app.json dans le projet généré par create-expo-app.
const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const expo = app.expo;

const build = Number(process.env.BUILD_NUMBER || 1);
Object.assign(expo, {
  name: 'Pixel Pulse',
  version: `2.0.${build}`,
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: '#000000',
});
expo.android = {
  ...expo.android,
  package: 'com.christophe.pixelpulse',
  versionCode: build,
  adaptiveIcon: {
    backgroundColor: '#000000',
    foregroundImage: './assets/adaptive.png',
    monochromeImage: './assets/monochrome.png',
  },
};

const plugins = [
  ['expo-splash-screen', { backgroundColor: '#000000', image: './assets/splash.png', imageWidth: 220 }],
  ['expo-media-library', { granularPermissions: ['photo', 'video'] }],
];
const names = plugins.map(([name]) => name);
expo.plugins = [
  ...(expo.plugins || []).filter((p) => !names.includes(Array.isArray(p) ? p[0] : p)),
  ...plugins,
];

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
