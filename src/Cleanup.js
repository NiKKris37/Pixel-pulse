import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Pressable, Text, View } from 'react-native';
import { File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library/legacy';
import { formatSize, keepLargest, toFileUri } from './files';
import { useStorage } from './hooks';
import { glow } from './theme';
import { haptic, NeonButton } from './ui';
import { styles } from './styles';

const PER_TYPE = 60; // nombre de fichiers gardés par catégorie
const TYPES = ['video', 'photo'];
const FILTERS = [['all', 'Tout'], ['video', 'Vidéos'], ['photo', 'Photos']];

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
  const run = useRef(0); // permet d'abandonner une analyse devenue inutile
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

      let seen = 0;
      const found = [];
      for (const mediaType of TYPES) {
        let top = [];
        let after;
        let more = true;
        while (more) {
          const page = await MediaLibrary.getAssetsAsync({ first: 200, after, mediaType: [mediaType] });
          if (id !== run.current) return;
          top = keepLargest(top, page.assets.map((a) => ({ ...a, size: sizeOf(a) })), PER_TYPE);
          seen += page.assets.length;
          setCount(seen);
          after = page.endCursor;
          more = page.hasNextPage;
        }
        found.push(...top);
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

  const shown = filter === 'all' ? files : files.filter((f) => f.mediaType === filter);

  const renderItem = ({ item }) => {
    const on = selected.has(item.id);
    return (
      <Pressable
        style={[styles.item, on && { borderColor: theme.main, boxShadow: `0px 0px 12px 0px ${theme.main}` }]}
        onPress={() => toggle(item.id)}
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
        </View>
        <View style={[styles.check, { borderColor: theme.main }, on && { backgroundColor: theme.main }]}>
          {on && <Text style={styles.checkMark}>✓</Text>}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button">
          <Text style={styles.back}>‹ Retour</Text>
        </Pressable>
        <Text style={[styles.title, glow(theme.main), { fontSize: 24 }]}>GRAND MÉNAGE</Text>
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
          ListEmptyComponent={<Text style={styles.note}>Aucun fichier à afficher.</Text>}
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
    </View>
  );
}
