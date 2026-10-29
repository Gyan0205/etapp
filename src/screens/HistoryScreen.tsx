import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoryById } from '../categories';
import { GroupRow } from '../components/GroupRow';
import { EmptyState, SectionHeader } from '../components/ui';
import { addMonths, dayLabel, daysInMonthSoFar, formatINR, monthLabel, toMonthKey } from '../format';
import {
  Expense,
  getCategoryTotalsForMonth,
  getExpensesForMonth,
  getTotalForMonth,
  groupExpenses,
} from '../services/expenseService';
import { cardShadow, radius, useColors } from '../theme';

export function HistoryScreen({ navigation }: any) {
  const c = useColors();
  const thisMonth = toMonthKey(new Date());
  const [month, setMonth] = useState(thisMonth);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [catTotals, setCatTotals] = useState<{ category: string; total: number }[]>([]);
  const [prevTotal, setPrevTotal] = useState(0);
  const [filter, setFilter] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setExpenses(await getExpensesForMonth(month));
        setCatTotals(await getCategoryTotalsForMonth(month));
        setPrevTotal(await getTotalForMonth(addMonths(month, -1)));
      })();
    }, [month]),
  );

  const changeMonth = (delta: number) => {
    setFilter(null);
    setMonth(addMonths(month, delta));
  };

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amountPaise, 0), [expenses]);
  const shown = useMemo(
    () => (filter ? expenses.filter((e) => e.category === filter) : expenses),
    [expenses, filter],
  );
  const shownTotal = useMemo(() => shown.reduce((s, e) => s + e.amountPaise, 0), [shown]);

  const days = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of shown) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return [...map.entries()]; // already newest first
  }, [shown]);

  const diff = total - prevTotal;
  const diffPct = prevTotal > 0 ? Math.round((Math.abs(diff) / prevTotal) * 100) : 0;
  const avgPerDay = Math.round(total / daysInMonthSoFar(month));
  const atLatest = month >= thisMonth;
  const card = [styles.card, { backgroundColor: c.card }, cardShadow(c)];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={styles.nav}>
        <TouchableOpacity
          onPress={() => changeMonth(-1)}
          hitSlop={10}
          style={[styles.navBtn, { backgroundColor: c.card }, cardShadow(c)]}
        >
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: c.text }]}>{monthLabel(month)}</Text>
        <TouchableOpacity
          onPress={() => changeMonth(1)}
          disabled={atLatest}
          hitSlop={10}
          style={[styles.navBtn, { backgroundColor: c.card, opacity: atLatest ? 0.35 : 1 }, cardShadow(c)]}
        >
          <Ionicons name="chevron-forward" size={22} color={c.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={card}>
          <Text style={[styles.sumLabel, { color: c.muted }]}>Total spent</Text>
          <Text style={[styles.sumValue, { color: c.text }]}>{formatINR(total)}</Text>
          <View style={styles.sumMeta}>
            {prevTotal > 0 && total > 0 && (
              <View style={[styles.pill, { backgroundColor: diff > 0 ? c.dangerSoft : c.primarySoft }]}>
                <Ionicons
                  name={diff > 0 ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={diff > 0 ? c.danger : c.good}
                />
                <Text style={[styles.pillText, { color: diff > 0 ? c.danger : c.good }]}>
                  {diffPct}% {diff > 0 ? 'more' : 'less'} than last month
                </Text>
              </View>
            )}
            {total > 0 && (
              <Text style={[styles.sumSmall, { color: c.muted }]}>
                {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'} · {formatINR(avgPerDay)}/day
              </Text>
            )}
          </View>

          {catTotals.length > 0 && (
            <>
              <View style={styles.stack}>
                {catTotals.map((t) => (
                  <View
                    key={t.category}
                    style={{
                      flex: t.total,
                      backgroundColor: categoryById(t.category).color,
                      opacity: filter && filter !== t.category ? 0.25 : 1,
                    }}
                  />
                ))}
              </View>

              {catTotals.map((t) => {
                const cat = categoryById(t.category);
                const pct = total ? Math.round((t.total / total) * 100) : 0;
                const active = filter === t.category;
                return (
                  <Pressable
                    key={t.category}
                    onPress={() => setFilter(active ? null : t.category)}
                    style={[styles.legend, active && { backgroundColor: cat.color + '1F' }]}
                    android_ripple={{ color: c.border }}
                  >
                    <View style={[styles.dot, { backgroundColor: cat.color }]} />
                    <Text style={[styles.legendName, { color: c.text }]}>{cat.label}</Text>
                    <Text style={[styles.legendPct, { color: c.muted }]}>{pct}%</Text>
                    <Text style={[styles.legendAmt, { color: c.text }]}>{formatINR(t.total)}</Text>
                    <Ionicons name={active ? 'close-circle' : 'chevron-forward'} size={16} color={c.faint} />
                  </Pressable>
                );
              })}
              <Text style={[styles.hint, { color: c.faint }]}>Tap a category to see just its history</Text>
            </>
          )}
        </View>

        {/* Filter chip */}
        {filter && (
          <View style={[styles.filterBar, { backgroundColor: categoryById(filter).color + '1F' }]}>
            <Ionicons name={categoryById(filter).icon} size={18} color={categoryById(filter).color} />
            <Text style={[styles.filterText, { color: c.text }]}>
              {categoryById(filter).label} · {formatINR(shownTotal)}
            </Text>
            <TouchableOpacity onPress={() => setFilter(null)} hitSlop={10}>
              <Text style={[styles.filterClear, { color: categoryById(filter).color }]}>Show all</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Days */}
        {days.length === 0 ? (
          <View style={[card, { marginTop: 16 }]}>
            <EmptyState
              icon="calendar-outline"
              title="Nothing here"
              subtitle={atLatest ? 'No expenses logged this month yet.' : 'No expenses were logged in this month.'}
            />
          </View>
        ) : (
          <>
            <SectionHeader left={filter ? 'History' : 'Day by day'} />
            {days.map(([date, items]) => (
              <View key={date} style={{ marginBottom: 14 }}>
                <View style={styles.dayHead}>
                  <Text style={[styles.dayName, { color: c.muted }]}>{dayLabel(date)}</Text>
                  <Text style={[styles.dayName, { color: c.muted }]}>
                    {formatINR(items.reduce((s, e) => s + e.amountPaise, 0))}
                  </Text>
                </View>
                <View style={[card, { overflow: 'hidden', padding: 0 }]}>
                  {groupExpenses(items).map((g, i) => (
                    <View key={g.key}>
                      {i > 0 && <View style={[styles.divider, { backgroundColor: c.border }]} />}
                      <GroupRow
                        group={g}
                        defaultExpanded={!!filter}
                        onPressExpense={(id) => navigation.navigate('AddExpense', { id })}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 19, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  card: { borderRadius: radius.lg, padding: 18 },
  sumLabel: { fontSize: 13, fontWeight: '700' },
  sumValue: { fontSize: 34, fontWeight: '800', marginTop: 2 },
  sumMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  pillText: { fontSize: 12.5, fontWeight: '800' },
  sumSmall: { fontSize: 12.5, fontWeight: '600' },

  stack: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, marginTop: 18, marginBottom: 10 },
  legend: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: radius.sm, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: 14.5, fontWeight: '700' },
  legendPct: { fontSize: 12.5, fontWeight: '700', width: 38, textAlign: 'right' },
  legendAmt: { fontSize: 14.5, fontWeight: '800', minWidth: 76, textAlign: 'right' },
  hint: { fontSize: 11.5, textAlign: 'center', marginTop: 8 },

  filterBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: 14, marginTop: 14 },
  filterText: { flex: 1, fontSize: 14.5, fontWeight: '800' },
  filterClear: { fontSize: 13.5, fontWeight: '800' },

  dayHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 6 },
  dayName: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 70 },
});
