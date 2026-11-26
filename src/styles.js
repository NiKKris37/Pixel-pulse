import { StyleSheet } from 'react-native';
import { NEON } from './theme';

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  subtitle: { color: '#8b93a7', textAlign: 'center', marginTop: 4 },

  ringBox: { width: 240, height: 240, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 24 },
  halo: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2 },
  arc: { position: 'absolute', width: 228, height: 228, borderRadius: 114, borderWidth: 5, borderColor: 'transparent' },
  arcInner: { position: 'absolute', width: 176, height: 176, borderRadius: 88, borderWidth: 3, borderColor: 'transparent' },
  percent: { color: '#fff', fontSize: 60, fontWeight: '200' },
  percentSign: { fontSize: 24 },

  card: { backgroundColor: '#05060a', borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 18 },
  cardTitle: { fontSize: 14, fontWeight: '800', letterSpacing: 3, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: 12 },
  label: { color: '#8b93a7', fontSize: 15 },
  value: { color: '#fff', fontSize: 15, flexShrink: 1, textAlign: 'right' },
  warning: { color: NEON.red, marginTop: 8 },

  track: { height: 10, borderRadius: 5, backgroundColor: '#171a24', marginVertical: 10 },
  fill: { height: 10, borderRadius: 5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14, marginTop: 6 },
  buttonSlot: { width: '47%' },
  button: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 16, alignItems: 'center', backgroundColor: '#000' },
  buttonText: { color: '#fff', fontWeight: '700' },

  buttonWide: { width: '100%' },
  swatches: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  swatchSlot: { alignItems: 'center', gap: 8, width: '23%' },
  swatch: { width: 42, height: 42, borderRadius: 21, borderWidth: 4 },
  swatchName: { color: '#8b93a7', fontSize: 12 },

  header: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  back: { color: '#fff', fontSize: 16, paddingVertical: 6 },
  filters: { flexDirection: 'row', gap: 10 },
  filter: { borderWidth: 1, borderColor: '#2a2f3d', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  filterText: { color: '#fff' },
  list: { paddingHorizontal: 20, paddingVertical: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: '#1c2030', backgroundColor: '#05060a' },
  thumb: { width: 58, height: 58, borderRadius: 8, backgroundColor: '#171a24' },
  play: { position: 'absolute', left: 10, top: 10, width: 58, height: 58, textAlign: 'center', textAlignVertical: 'center', color: '#fff', fontSize: 22, textShadowColor: '#000', textShadowRadius: 6 },
  itemText: { flex: 1 },
  itemName: { color: '#fff', fontSize: 14 },
  itemSize: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#000', fontWeight: '900' },
  footer: { padding: 20, paddingTop: 8 },
  note: { color: '#8b93a7', textAlign: 'center', marginVertical: 8 },
});
