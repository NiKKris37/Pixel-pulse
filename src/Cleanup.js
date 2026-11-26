import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Pressable, Text, View } from 'react-native';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library/legacy';
import { formatSize, identicalGroups, isOld, sameSizeGroups, toFileUri } from './files';
import { useStorage } from './hooks';
import { haptic, Header, NeonButton } from './ui';
import Preview from './Preview';
import { styles } from './styles';

const SHOWN = 150; // nombre maximal de fichiers affichés par catégorie
const TYPES = ['video', 'photo'];
const FILTERS = [
  ['all', 'Tout'], ['video', 'Vidéos'], ['photo', 'Photos'],
  ['old', 'Anciens'], ['dupes', 'Doublons'],
];

function sizeOf(asset) {
  try {
    return new File(toFileUri(asset.uri)).size ?? 0;
  } catch (e) {
    return 0;
  }
}

export default function Cleanup({ theme, onBack }) {
  const [status, setStatus] = useState('start'); // start | denied | scan | ready | error
  const [limited, setLimited] = useState(false);
  const [count, setCount] = useState(0);
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [dupes, setDupes] = useState(null); // null tant que la comparaison n'est pas faite
  const [compared, setCompared] = useState('');
  const run = useRef(0); // permet d'abandonner une analyse devenue inutile
  const compareRun = useRef(0);
  const storage = useStorage(files.length);

  const scan = useCallback(async () => {
    const id = ++run.current;
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
      if (id !== run.current) return;
      if (!permission.granted) {
        setStatus('denied');
        return;
      }
      setLimited(permission.accessPrivileges === 'limited');
      setStatus('scan');
      setSelected(new Set());
      setCount(0);
      setDupes(null);

      let seen = 0;
      const found = [];
      for (const mediaType of TYPES) {
        let after;
        let more = true;
        while (more) {
          const page = await MediaLibrary.getAssetsAsync({ first: 200, after, mediaType: [mediaType] });
          if (id !== run.current) return;
          for (const a of page.assets) {
            const size = sizeOf(a);
            if (size > 0) found.push({ ...a, size });
          }
          seen += page.assets.length;
          setCount(seen);
          after = page.endCursor;
          more = page.hasNextPage;
        }
      }
      setFiles(found.sort((a, b) => b.size - a.size));
      setStatus('ready');
    } catch (e) {
      console.warn('Analyse impossible', e);
      if (id === run.current) setStatus('error');
    }
  }, []);

  useEffect(() => {
    scan();
    return () => { run.current += 1; };
  }, [scan]);

  // Compare le contenu des fichiers de même taille, seulement quand on le demande
  useEffect(() => {
    if (filter !== 'dupes' || status !== 'ready' || dupes !== null) return undefined;
    const id = ++compareRun.current;
    (async () => {
      const candidates = sameSizeGroups(files).flat();
      const digests = new Map();
      for (let i = 0; i < candidates.length; i += 1) {
        setCompared(`${i + 1} / ${candidates.length}`);
        try {
          digests.set(candidates[i].id, await new File(toFileUri(candidates[i].uri)).digest('MD5'));
        } catch (e) {
          console.warn('Fichier illisible', e);
        }
        if (id !== compareRun.current) return;
      }
      setDupes(identicalGroups(candidates, digests));
    })();
    return () => { compareRun.current += 1; };
  }, [filter, status, dupes, files]);

  const toggle = (id) => {
    haptic();
    setMessage('');
    setSelected((old) => {
      const next = new Set(old);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };

  const chosen = files.filter((f) => selected.has(f.id));
  const chosenSize = chosen.reduce((sum, f) => sum + f.size, 0);

  const remove = async () => {
    setDeleting(true);
    try {
      const ids = chosen.map((f) => f.id);
      await MediaLibrary.deleteAssetsAsync(ids);
      const gone = new Set(ids);
      setFiles((old) => old.filter((f) => !gone.has(f.id)));
      setDupes((old) => old && old
        .map((g) => g.filter((f) => !gone.has(f.id)))
        .filter((g) => g.length > 1));
      setSelected(new Set());
      setMessage(`${formatSize(chosenSize)} libérés`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      console.warn('Suppression impossible', e);
      setMessage('Suppression annulée ou impossible');
    } finally {
      setDeleting(false);
    }
  };

  const confirm = () =>
    Alert.alert(
      `Supprimer ${chosen.length} fichier(s) ?`,
      `${formatSize(chosenSize)} seront effacés définitivement de ce téléphone.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: remove },
      ]
    );

  // Le filtre ne doit pas laisser des fichiers cochés mais invisibles
  const changeFilter = (key) => {
    haptic();
    setFilter(key);
    setSelected(new Set());
  };

  // Dans les doublons, le premier de chaque groupe ne peut pas être coché
  let shown;
  if (filter === 'dupes') {
    shown = (dupes ?? []).flatMap((g) => g.map((f, i) => ({ ...f, keep: i === 0 })));
  } else {
    const matching = files.filter((f) =>
      filter === 'all' || (filter === 'old' ? isOld(f, Date.now()) : f.mediaType === filter));
    shown = matching.slice(0, SHOWN);
  }
  const copies = filter === 'dupes' ? shown.filter((f) => !f.keep) : [];
  const comparing = filter === 'dupes' && dupes === null;

  const renderItem = ({ item }) => {
    const on = selected.has(item.id);
    return (
      <Pressable
        style={[styles.item, on && { borderColor: theme.main, boxShadow: `0px 0px 12px 0px ${theme.main}` }]}
        onPress={() => !item.keep && toggle(item.id)}
        onLongPress={() => { haptic(); setPreview(item); }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
      >
        <Image source={{ uri: toFileUri(item.uri) }} style={styles.thumb} resizeMethod="resize" />
        {item.mediaType === 'video' && <Text style={styles.play}>▶</Text>}
        <View style={styles.itemText}>
          <Text style={styles.itemName} numberOfLines={1}>{item.filename}</Text>
          <Text style={[styles.itemSize, { color: theme.second }]}>{formatSize(item.size)}</Text>
          <Text style={styles.swatchName}>
            {new Date(item.modificationTime).toLocaleDateString('fr-FR')}
          </Text>
          {item.keep && <Text style={[styles.swatchName, { color: theme.third }]}>Exemplaire gardé</Text>}
        </View>
        {!item.keep && (
          <View style={[styles.check, { borderColor: theme.main }, on && { backgroundColor: theme.main }]}>
            {on && <Text style={styles.checkMark}>✓</Text>}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Header title="GRAND MÉNAGE" color={theme.main} onBack={onBack} />
        {storage && <Text style={styles.subtitle}>{formatSize(storage.free)} libres</Text>}
        {status === 'ready' && (
          <View style={styles.filters}>
            {FILTERS.map(([key, label]) => (
              <Pressable
                key={key}
                style={[styles.filter, filter === key && { borderColor: theme.main }]}
                onPress={() => changeFilter(key)}
                accessibilityRole="button"
              >
                <Text style={styles.filterText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {status === 'ready' && <Text style={styles.hint}>Appui long sur un fichier pour l'aperçu</Text>}
        {copies.length > 0 && (
          <Pressable
            onPress={() => { haptic(); setSelected(new Set(copies.map((f) => f.id))); }}
            accessibilityRole="button"
          >
            <Text style={[styles.link, { color: theme.second }]}>Tout cocher</Text>
          </Pressable>
        )}
        {limited && (
          <Text style={styles.note}>
            Accès partiel : seuls les fichiers autorisés apparaissent. Modifie-le dans les réglages de l'application.
          </Text>
        )}
      </View>

      {status === 'ready' ? (
        <FlatList
          data={shown}
          keyExtractor={(f) => f.id}
          renderItem={renderItem}
          extraData={selected}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.note}>
              {comparing ? `Comparaison… ${compared}` : 'Aucun fichier à afficher.'}
            </Text>
          }
        />
      ) : (
        <View style={[styles.screen, styles.content, { justifyContent: 'center', gap: 16 }]}>
          {(status === 'scan' || status === 'start') && (
            <>
              <ActivityIndicator size="large" color={theme.main} />
              <Text style={styles.note}>Analyse… {count} fichiers</Text>
            </>
          )}
          {status === 'denied' && (
            <>
              <Text style={styles.note}>L'accès aux photos et vidéos est nécessaire pour trouver les plus lourdes.</Text>
              <NeonButton wide label="Autoriser l'accès" color={theme.main} onPress={scan} />
              <NeonButton wide label="Ouvrir les réglages" color={theme.second} onPress={() => Linking.openSettings()} />
            </>
          )}
          {status === 'error' && (
            <>
              <Text style={styles.note}>L'analyse a échoué.</Text>
              <NeonButton wide label="Réessayer" color={theme.main} onPress={scan} />
            </>
          )}
        </View>
      )}

      {status === 'ready' && (
        <View style={styles.footer}>
          {message !== '' && <Text style={styles.note}>{message}</Text>}
          <NeonButton
            wide
            label={chosen.length ? `SUPPRIMER ${chosen.length} · ${formatSize(chosenSize)}` : 'Touche les fichiers à supprimer'}
            color={theme.main}
            disabled={!chosen.length || deleting}
            onPress={confirm}
          />
        </View>
      )}

      {preview && <Preview file={preview} theme={theme} onClose={() => setPreview(null)} />}
    </View>
  );
}
