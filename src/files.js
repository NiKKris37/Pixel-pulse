// Fonctions sans dépendance, testables hors du téléphone.
const comma = (n) => n.toFixed(1).replace('.', ',');

export const toGB = (bytes) => comma(bytes / 1e9); // Go décimaux

export function formatSize(bytes) {
  if (bytes >= 1e9) return `${comma(bytes / 1e9)} Go`;
  if (bytes >= 1e6) return `${comma(bytes / 1e6)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1e3))} Ko`;
}

// La médiathèque renvoie « file:///chemin » sans encodage : « # » ou « % » casseraient l'adresse
export function toFileUri(uri) {
  const path = uri.replace(/^file:\/\//, '');
  return 'file://' + path.split('/').map(encodeURIComponent).join('/');
}

export const keepLargest = (current, added, limit) =>
  [...current, ...added.filter((f) => f.size > 0)]
    .sort((a, b) => b.size - a.size)
    .slice(0, limit);
