import { Image, Modal, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { formatSize, toFileUri } from './files';
import { NeonButton } from './ui';
import { styles } from './styles';

function VideoPreview({ uri }) {
  const player = useVideoPlayer(uri, (p) => p.play());
  return <VideoView player={player} style={styles.media} contentFit="contain" nativeControls />;
}

export default function Preview({ file, theme, onClose }) {
  const uri = toFileUri(file.uri);
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <SafeBox>
        <Text style={styles.itemName} numberOfLines={2}>{file.filename}</Text>
        <Text style={[styles.itemSize, { color: theme.second }]}>{formatSize(file.size)}</Text>
        {file.mediaType === 'video'
          ? <VideoPreview uri={uri} />
          : <Image source={{ uri }} style={styles.media} resizeMode="contain" />}
        <NeonButton wide label="FERMER" color={theme.main} onPress={onClose} />
      </SafeBox>
    </Modal>
  );
}

// Une fenêtre modale a besoin de ses propres marges de sécurité
function SafeBox({ children }) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.modal}>{children}</SafeAreaView>
    </SafeAreaProvider>
  );
}
