import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import { categoryById } from '../categories';
import { formatINR } from '../format';
import type { ExpenseGroup } from '../services/expenseService';
import { useColors } from '../theme';
import { ExpenseRow } from './ExpenseRow';

interface Props {
  group: ExpenseGroup;
  onPressExpense: (id: number) => void;
  defaultExpanded?: boolean;
}

/** One line per day + category with the total; tap to see each payment separately. */
export function GroupRow({ group, onPressExpense, defaultExpanded }: Props) {
  const c = useColors();
  const [open, setOpen] = useState(!!defaultExpanded);

  if (group.items.length === 1) {
    const e = group.items[0];
    return <ExpenseRow expense={e} onPress={() => onPressExpense(e.id)} />;
  }

  const cat = categoryById(group.category);
  const modes = [...new Set(group.items.map((i) => i.mode))].join(' + ');

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(!open);
  };

  return (
    <View>
      <Pressable onPress={toggle} style={styles.row} android_ripple={{ color: c.border }}>
        <View style={[styles.icon, { backgroundColor: cat.color + '26' }]}>
          <Ionicons name={cat.icon} size={21} color={cat.color} />
        </View>
        <View style={styles.mid}>
          <Text style={[styles.title, { color: c.text }]}>{cat.label}</Text>
          <View style={styles.subRow}>
            <View style={[styles.badge, { backgroundColor: cat.color + '26' }]}>
              <Text style={[styles.badgeText, { color: cat.color }]}>{group.items.length} payments</Text>
            </View>
            <Text style={[styles.sub, { color: c.muted }]} numberOfLines={1}>
              {modes}
            </Text>
          </View>
        </View>
        <Text style={[styles.amount, { color: c.text }]}>{formatINR(group.total)}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.faint} style={{ marginLeft: 6 }} />
      </Pressable>

      {open && (
        <View style={[styles.children, { borderLeftColor: cat.color + '66' }]}>
          {group.items.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => onPressExpense(e.id)}
              style={styles.child}
              android_ripple={{ color: c.border }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.childTitle, { color: c.text }]}>{e.mode}</Text>
                {!!e.note && (
                  <Text style={[styles.sub, { color: c.muted }]} numberOfLines={1}>
                    {e.note}
                  </Text>
                )}
              </View>
              <Text style={[styles.childAmount, { color: c.text }]}>{formatINR(e.amountPaise)}</Text>
              <Ionicons name="create-outline" size={16} color={c.faint} style={{ marginLeft: 8 }} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, minHeight: 64 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1, marginHorizontal: 12 },
  title: { fontSize: 15, fontWeight: '700' },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 6 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  sub: { fontSize: 12.5, marginTop: 2, flexShrink: 1 },
  amount: { fontSize: 15.5, fontWeight: '800' },
  children: { marginLeft: 36, marginRight: 14, marginBottom: 8, borderLeftWidth: 3, paddingLeft: 12 },
  child: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  childTitle: { fontSize: 14, fontWeight: '700' },
  childAmount: { fontSize: 14.5, fontWeight: '700' },
});
