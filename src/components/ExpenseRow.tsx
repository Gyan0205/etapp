import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { categoryById } from '../categories';
import { formatINR } from '../format';
import type { Expense } from '../services/expenseService';
import { useColors } from '../theme';

export function ExpenseRow({ expense, onPress }: { expense: Expense; onPress: () => void }) {
  const c = useColors();
  const cat = categoryById(expense.category);
  return (
    <Pressable onPress={onPress} style={styles.row} android_ripple={{ color: c.border }}>
      <View style={[styles.icon, { backgroundColor: cat.color + '26' }]}>
        <Ionicons name={cat.icon} size={21} color={cat.color} />
      </View>
      <View style={styles.mid}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {cat.label}
        </Text>
        <Text style={[styles.sub, { color: c.muted }]} numberOfLines={1}>
          {expense.mode}
          {expense.note ? ` · ${expense.note}` : ''}
        </Text>
      </View>
      <Text style={[styles.amount, { color: c.text }]}>{formatINR(expense.amountPaise)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, minHeight: 64 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1, marginHorizontal: 12 },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12.5, marginTop: 2 },
  amount: { fontSize: 15.5, fontWeight: '800' },
});
