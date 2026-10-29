import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { IconName } from '../categories';
import { useColors } from '../theme';

export function EmptyState({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
        <Ionicons name={icon} size={34} color={c.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.emptySub, { color: c.muted }]}>{subtitle}</Text>}
    </View>
  );
}

export function SectionHeader({ left, right }: { left: string; right?: string }) {
  const c = useColors();
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionLeft, { color: c.text }]}>{left}</Text>
      {!!right && <Text style={[styles.sectionRight, { color: c.muted }]}>{right}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 14 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 22, marginBottom: 8 },
  sectionLeft: { fontSize: 15, fontWeight: '800' },
  sectionRight: { fontSize: 13, fontWeight: '700' },
});
