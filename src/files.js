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

const YEAR = 365 * 24 * 3600 * 1000;
export const isOld = (file, now) =>
  file.modificationTime > 0 && now - file.modificationTime > YEAR;

// Seuls des fichiers de même taille peuvent être identiques : on évite de lire les autres
export function sameSizeGroups(files) {
  const groups = new Map();
  for (const f of files) {
    if (f.size > 0) groups.set(f.size, [...(groups.get(f.size) ?? []), f]);
  }
  return [...groups.values()].filter((g) => g.length > 1).sort((a, b) => b[0].size - a[0].size);
}

// Regroupe par empreinte ; le plus ancien de chaque groupe est l'exemplaire à garder
export function identicalGroups(files, digests) {
  const groups = new Map();
  for (const f of files) {
    const digest = digests.get(f.id);
    if (!digest) continue; // illisible : jamais considéré comme doublon
    const key = `${f.size}:${digest}`;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => [...g].sort((a, b) => a.modificationTime - b.modificationTime));
}
