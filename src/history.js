// Historique de la batterie : fonctions sans dépendance, testables hors du téléphone.
export const DAY = 24 * 3600 * 1000;
const EVERY = 10 * 60 * 1000; // un point au moins toutes les 10 minutes
const MAX_GAP = 6 * 3600 * 1000;

// Renvoie le même tableau s'il n'y a rien à ajouter
export function addSample(samples, sample) {
  const last = samples[samples.length - 1];
  if (last && last.level === sample.level && last.plugged === sample.plugged
      && sample.t - last.t < EVERY) {
    return samples;
  }
  return [...samples.filter((s) => sample.t - s.t <= DAY && s.t <= sample.t), sample];
}

// Vitesse de décharge en %/h depuis la dernière charge, ou null si trop tôt pour le dire
export function dischargeRate(samples) {
  let i = samples.length - 1;
  if (i < 0 || samples[i].plugged) return null;
  const end = samples[i];
  while (i > 0) {
    const before = samples[i - 1];
    const after = samples[i];
    if (before.plugged || before.level < after.level || after.t - before.t > MAX_GAP) break;
    i -= 1;
  }
  const start = samples[i];
  const drop = start.level - end.level;
  const hours = (end.t - start.t) / 3600000;
  return drop >= 2 && hours >= 0.25 ? drop / hours : null;
}

export function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
