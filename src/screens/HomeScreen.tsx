import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GroupRow } from '../components/GroupRow';
import { EmptyState, SectionHeader } from '../components/ui';
import {
  addDays,
  addMonths,
  dayLabel,
  daysInMonthSoFar,
  formatINR,
  monthLabel,
  toDateKey,
  toMonthKey,
} from '../format';
import {
  Expense,
  getDailyTotals,
  getRecent,
  getTotalForDate,
  getTotalForMonth,
  groupExpenses,
} from '../services/expenseService';
import {
  Payment,
  getEnabledAt,
  getPendingPayments,
  getSetting,
  ignorePayment,
  isSupported,
  setSetting,
} from '../services/upiDetect';
import { cardShadow, radius, useColors } from '../theme';

const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function HomeScreen({ navigation }: any) {
  const c = useColors();
  const [today, setToday] = useState(0);
  const [month, setMonth] = useState(0);
  const [prevMonth, setPrevMonth] = useState(0);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [week, setWeek] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<Payment[]>([]);
  const [detectOn, setDetectOn] = useState(true);
  const [bannerHidden, setBannerHidden] = useState(true);

  const now = new Date();
  const monthKey = toMonthKey(now);

  useFocusEffect(
    useCallback(() => {
      const n = new Date();
      const mk = toMonthKey(n);
      (async () => {
        setToday(await getTotalForDate(toDateKey(n)));
        setMonth(await getTotalForMonth(mk));
        setPrevMonth(await getTotalForMonth(addMonths(mk, -1)));
        setWeek(await getDailyTotals(toDateKey(addDays(n, -6)), toDateKey(n)));
        setRecent(await getRecent(40));
        setDetectOn((await getEnabledAt()) !== null);
        setBannerHidden((await getSetting('upi_banner_dismissed')) === '1');
        setPending(await getPendingPayments());
      })();
    }, []),
  );

  const weekDays = useMemo(() => {
    const n = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(n, i - 6);
      return { key: toDateKey(d), letter: WEEKDAY[d.getDay()], isToday: i === 6 };
    });
  }, [recent, today]);
  const weekMax = Math.max(1, ...weekDays.map((d) => week[d.key] ?? 0));
  const weekTotal = weekDays.reduce((s, d) => s + (week[d.key] ?? 0), 0);

  const sections = useMemo(() => {
    const byDay = new Map<string, Expense[]>();
    for (const e of recent) {
      if (!byDay.has(e.date)) byDay.set(e.date, []);
      byDay.get(e.date)!.push(e);
    }
    return [...byDay.entries()].slice(0, 5).map(([date, items]) => ({
      date,
      total: items.reduce((s, e) => s + e.amountPaise, 0),
      groups: groupExpenses(items),
    }));
  }, [recent]);

  const avgPerDay = Math.round(month / daysInMonthSoFar(monthKey));
  const dismissPayment = async (key: string) => {
    await ignorePayment(key);
    setPending((list) => list.filter((p) => p.key !== key));
  };
  const hideBanner = async () => {
    setBannerHidden(true);
    await setSetting('upi_banner_dismissed', '1');
  };
  const openEdit = (id: number) => navigation.navigate('AddExpense', { id });
  const card = [styles.card, { backgroundColor: c.card }, cardShadow(c)];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.hello, { color: c.muted }]}>
              {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={[styles.title, { color: c.text }]}>My Spending</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: c.primary }]}>
          <View style={[styles.blob, { top: -40, right: -30, width: 150, height: 150 }]} />
          <View style={[styles.blob, { bottom: -50, right: 60, width: 110, height: 110 }]} />
          <Text style={[styles.heroLabel, { color: c.onPrimary }]}>{monthLabel(monthKey)}</Text>
          <Text style={[styles.heroAmount, { color: c.onPrimary }]}>{formatINR(month)}</Text>
          <Text style={[styles.heroSub, { color: c.onPrimary }]}>
            {prevMonth > 0 ? `Last month: ${formatINR(prevMonth)}` : 'Spent so far this month'}
          </Text>
          <View style={styles.heroStats}>
            <View style={[styles.heroStat, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
              <Text style={[styles.heroStatLabel, { color: c.onPrimary }]}>Today</Text>
              <Text style={[styles.heroStatValue, { color: c.onPrimary }]}>{formatINR(today)}</Text>
            </View>
            <View style={[styles.heroStat, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
              <Text style={[styles.heroStatLabel, { color: c.onPrimary }]}>Daily average</Text>
              <Text style={[styles.heroStatValue, { color: c.onPrimary }]}>{formatINR(avgPerDay)}</Text>
            </View>
          </View>
        </View>

        {/* Turn-on prompt */}
        {isSupported && !detectOn && !bannerHidden && (
          <View style={[card, styles.promo, { marginTop: 16, backgroundColor: c.primarySoft }]}>
            <Ionicons name="flash-outline" size={24} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.promoTitle, { color: c.text }]}>Auto-add UPI payments</Text>
              <Text style={[styles.promoText, { color: c.muted }]}>
                Get asked to add PhonePe, Paytm and Google Pay payments the moment you pay.
              </Text>
              <View style={styles.promoBtns}>
                <Pressable onPress={() => navigation.navigate('Settings')} style={[styles.promoBtn, { backgroundColor: c.primary }]}>
                  <Text style={[styles.promoBtnText, { color: c.onPrimary }]}>Set up</Text>
                </Pressable>
                <Pressable onPress={hideBanner} style={styles.promoBtn}>
                  <Text style={[styles.promoBtnText, { color: c.muted }]}>Not now</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Detected UPI payments */}
        {pending.length > 0 && (
          <>
            <SectionHeader left="Payments detected" right={`${pending.length} to review`} />
            {pending.map((p) => (
              <View key={p.key} style={[card, styles.detected]}>
                <View style={styles.detectedTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detectedAmount, { color: c.text }]}>{formatINR(p.amountPaise)}</Text>
                    <Text style={[styles.detectedSub, { color: c.muted }]} numberOfLines={1}>
                      {p.payee ? `Paid to ${p.payee}` : 'UPI payment'} ·{' '}
                      {new Date(p.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                    </Text>
                    {/^\d+$/.test(p.txnId) && (
                      <Text style={[styles.detectedRef, { color: c.faint }]}>UPI Ref {p.txnId}</Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.detectedAsk, { color: c.text }]}>Add this to your expenses?</Text>
                <View style={styles.detectedBtns}>
                  <Pressable onPress={() => dismissPayment(p.key)} style={[styles.dBtn, { backgroundColor: c.chip }]}>
                    <Text style={[styles.dBtnText, { color: c.text }]}>No, ignore</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => navigation.navigate('AddExpense', { prefill: p })}
                    style={[styles.dBtn, { backgroundColor: c.primary, flex: 1.4 }]}
                  >
                    <Text style={[styles.dBtnText, { color: c.onPrimary }]}>Yes, choose category</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Last 7 days */}
        <SectionHeader left="Last 7 days" right={formatINR(weekTotal)} />
        <View style={[card, styles.chart]}>
          {weekDays.map((d) => {
            const v = week[d.key] ?? 0;
            const h = v > 0 ? Math.max(8, (v / weekMax) * 84) : 4;
            return (
              <View key={d.key} style={styles.barCol}>
                <Text style={[styles.barValue, { color: c.muted }]} numberOfLines={1}>
                  {v > 0 ? Math.round(v / 100) : ''}
                </Text>
                <View
                  style={[
                    styles.bar,
                    { height: h, backgroundColor: v > 0 ? (d.isToday ? c.primary : c.primary + '88') : c.track },
                  ]}
                />
                <Text style={[styles.barLabel, { color: d.isToday ? c.primary : c.muted, fontWeight: d.isToday ? '800' : '600' }]}>
                  {d.letter}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Recent */}
        <SectionHeader left="Recent" />
        {sections.length === 0 ? (
          <View style={card}>
            <EmptyState
              icon="wallet-outline"
              title="No expenses yet"
              subtitle="Paid for something? Tap “Add expense” and log it in a few seconds."
            />
          </View>
        ) : (
          sections.map((s) => (
            <View key={s.date} style={{ marginBottom: 14 }}>
              <View style={styles.dayHead}>
                <Text style={[styles.dayName, { color: c.muted }]}>{dayLabel(s.date)}</Text>
                <Text style={[styles.dayName, { color: c.muted }]}>{formatINR(s.total)}</Text>
              </View>
              <View style={[card, { overflow: 'hidden' }]}>
                {s.groups.map((g, i) => (
                  <View key={g.key}>
                    {i > 0 && <View style={[styles.divider, { backgroundColor: c.border }]} />}
                    <GroupRow group={g} onPressExpense={openEdit} />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Pressable
        onPress={() => navigation.navigate('AddExpense', {})}
        style={[styles.fab, { backgroundColor: c.primary }]}
        android_ripple={{ color: '#ffffff44', borderless: false }}
      >
        <Ionicons name="add" size={26} color={c.onPrimary} />
        <Text style={[styles.fabText, { color: c.onPrimary }]}>Add expense</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 110 },
  header: { paddingTop: 8, paddingBottom: 14 },
  hello: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', marginTop: 2 },

  hero: { borderRadius: radius.lg + 4, padding: 20, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroLabel: { fontSize: 13, fontWeight: '700', opacity: 0.85 },
  heroAmount: { fontSize: 40, fontWeight: '800', marginTop: 6 },
  heroSub: { fontSize: 13, fontWeight: '600', opacity: 0.8, marginTop: 2 },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  heroStat: { flex: 1, borderRadius: radius.md, padding: 12 },
  heroStatLabel: { fontSize: 12, fontWeight: '700', opacity: 0.8 },
  heroStatValue: { fontSize: 18, fontWeight: '800', marginTop: 3 },

  card: { borderRadius: radius.lg },
  chart: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, height: 148 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: { width: 22, borderRadius: 8 },
  barValue: { fontSize: 10, fontWeight: '700' },
  barLabel: { fontSize: 12, marginTop: 2 },

  dayHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 6 },
  dayName: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 70 },

  promo: { flexDirection: 'row', gap: 12, padding: 16, alignItems: 'flex-start' },
  promoTitle: { fontSize: 15, fontWeight: '800' },
  promoText: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  promoBtns: { flexDirection: 'row', gap: 8, marginTop: 12 },
  promoBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill },
  promoBtnText: { fontSize: 13.5, fontWeight: '800' },

  detected: { padding: 16, marginBottom: 10 },
  detectedTop: { flexDirection: 'row', alignItems: 'center' },
  detectedAmount: { fontSize: 26, fontWeight: '800' },
  detectedSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  detectedRef: { fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  detectedAsk: { fontSize: 14, fontWeight: '700', marginTop: 12 },
  detectedBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  dBtn: { flex: 1, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dBtnText: { fontSize: 14, fontWeight: '800' },

  fab: {
    position: 'absolute',
    right: 18,
    bottom: 20,
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { fontSize: 15, fontWeight: '800' },
});
