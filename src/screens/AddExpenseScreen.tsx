import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { IconName, CATEGORIES, PAYMENT_MODES } from '../categories';
import { addDays, formatINR, fromDateKey, parseRupeesToPaise, toDateKey } from '../format';
import { addExpense, deleteExpense, getExpense, updateExpense } from '../services/expenseService';
import { ignorePayment, isAlreadySaved, type Payment } from '../services/upiDetect';
import { cardShadow, radius, useColors } from '../theme';

const MODE_ICONS: Record<string, IconName> = {
  UPI: 'phone-portrait-outline',
  Cash: 'cash-outline',
  Card: 'card-outline',
  Other: 'ellipsis-horizontal-circle-outline',
};
const QUICK = [10, 50, 100, 500];

export function AddExpenseScreen({ route, navigation }: any) {
  const c = useColors();
  const editId: number | undefined = route.params?.id;
  // Set when opened from a detected UPI payment (notification or the "detected" cards on Home).
  const prefill: Payment | undefined = route.params?.prefill;
  const [amount, setAmount] = useState(prefill ? String(prefill.amountPaise / 100) : '');
  // A detected payment has no category yet; the user must choose one.
  const [category, setCategory] = useState<string>(prefill ? '' : 'food');
  const [mode, setMode] = useState<string>('UPI');
  const [note, setNote] = useState(prefill?.payee ?? '');
  const [date, setDate] = useState(prefill ? new Date(prefill.timestamp) : new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [txnId, setTxnId] = useState(prefill?.txnId ?? '');

  const paise = parseRupeesToPaise(amount);
  const todayKey = toDateKey(new Date());
  const dateKey = toDateKey(date);
  const yesterdayKey = toDateKey(addDays(new Date(), -1));
  const isCustomDate = dateKey !== todayKey && dateKey !== yesterdayKey;
  const cat = CATEGORIES.find((x) => x.id === category);

  const remove = useCallback(
    () =>
      Alert.alert('Delete this expense?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteExpense(editId!);
            navigation.goBack();
          },
        },
      ]),
    [editId, navigation],
  );

  useEffect(() => {
    navigation.setOptions({
      title: editId ? 'Edit expense' : 'New expense',
      headerRight: editId
        ? () => (
            <TouchableOpacity onPress={remove} hitSlop={12} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={22} color={c.danger} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [editId, navigation, remove, c.danger]);

  useEffect(() => {
    if (!prefill) return;
    isAlreadySaved(prefill.key).then((saved) => {
      if (!saved) return;
      Alert.alert('Already added', 'This payment is already in your expenses.');
      navigation.goBack();
    });
  }, [prefill, navigation]);

  useEffect(() => {
    if (!editId) return;
    getExpense(editId).then((e) => {
      if (!e) return;
      setTxnId(e.txnId);
      setAmount(String(e.amountPaise / 100));
      setCategory(e.category);
      setMode(e.mode);
      setNote(e.note);
      setDate(fromDateKey(e.date));
    });
  }, [editId]);

  const save = async () => {
    if (paise === null || !cat) return;
    const data = {
      amountPaise: paise,
      category,
      mode,
      note: note.trim(),
      date: dateKey,
      txnId: prefill?.key ?? undefined,
    };
    if (editId) await updateExpense(editId, data);
    else await addExpense(data);
    navigation.goBack();
  };

  const bump = (n: number) => {
    const cur = parseFloat(amount) || 0;
    setAmount(String(Math.round((cur + n) * 100) / 100));
  };

  const ignore = async () => {
    if (prefill) await ignorePayment(prefill.key);
    navigation.goBack();
  };

  const surface = [styles.surface, { backgroundColor: c.card }, cardShadow(c)];
  const label = [styles.label, { color: c.muted }];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {(prefill || /^\d+$/.test(txnId)) && (
          <View style={[styles.banner, { backgroundColor: c.primarySoft }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: c.text }]}>
                {prefill ? 'Payment detected from your bank SMS' : 'Added from a detected payment'}
              </Text>
              {/^\d+$/.test(txnId) && (
                <Text style={[styles.bannerSub, { color: c.muted }]}>UPI Ref {txnId}</Text>
              )}
            </View>
          </View>
        )}

        {/* Amount */}
        <View style={[surface, styles.amountCard]}>
          <Text style={[styles.amountCaption, { color: c.muted }]}>How much did you spend?</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.rupee, { color: amount ? c.text : c.faint }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: c.text }]}
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              placeholderTextColor={c.faint}
              keyboardType="decimal-pad"
              autoFocus={!editId && !prefill}
              maxLength={10}
              selectionColor={c.primary}
            />
          </View>
          <View style={styles.quickRow}>
            {QUICK.map((n) => (
              <Pressable key={n} onPress={() => bump(n)} style={[styles.quick, { backgroundColor: c.chip }]}>
                <Text style={[styles.quickText, { color: c.text }]}>+{n}</Text>
              </Pressable>
            ))}
            {!!amount && (
              <Pressable onPress={() => setAmount('')} style={[styles.quick, { backgroundColor: c.dangerSoft }]}>
                <Text style={[styles.quickText, { color: c.danger }]}>Clear</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Category */}
        <Text style={label}>CATEGORY</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((x) => {
            const active = x.id === category;
            return (
              <Pressable
                key={x.id}
                onPress={() => setCategory(x.id)}
                style={[
                  styles.cat,
                  { backgroundColor: active ? x.color : c.card },
                  !active && cardShadow(c),
                ]}
              >
                <Ionicons name={x.icon} size={26} color={active ? '#fff' : x.color} />
                <Text style={[styles.catText, { color: active ? '#fff' : c.text }]}>{x.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Payment mode */}
        <Text style={label}>PAID VIA</Text>
        <View style={[surface, styles.segment]}>
          {PAYMENT_MODES.map((m) => {
            const active = m === mode;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.segItem, active && { backgroundColor: c.primary }]}
              >
                <Ionicons name={MODE_ICONS[m]} size={18} color={active ? c.onPrimary : c.muted} />
                <Text style={[styles.segText, { color: active ? c.onPrimary : c.text }]}>{m}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Date */}
        <Text style={label}>DATE</Text>
        <View style={styles.dateRow}>
          {[
            { text: 'Today', active: dateKey === todayKey, onPress: () => setDate(new Date()) },
            { text: 'Yesterday', active: dateKey === yesterdayKey, onPress: () => setDate(addDays(new Date(), -1)) },
            {
              text: isCustomDate ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pick date',
              active: isCustomDate,
              onPress: () => setShowPicker(true),
              icon: true,
            },
          ].map((d) => (
            <Pressable
              key={d.text}
              onPress={d.onPress}
              style={[styles.dateChip, { backgroundColor: d.active ? c.primarySoft : c.card, borderColor: d.active ? c.primary : c.border }]}
            >
              {d.icon && <Ionicons name="calendar-outline" size={15} color={d.active ? c.primary : c.muted} />}
              <Text style={[styles.dateText, { color: d.active ? c.primary : c.text }]}>{d.text}</Text>
            </Pressable>
          ))}
        </View>
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            maximumDate={new Date()}
            onChange={(_, d) => {
              setShowPicker(false);
              if (d) setDate(d);
            }}
          />
        )}

        {/* Note */}
        <Text style={label}>NOTE (OPTIONAL)</Text>
        <TextInput
          style={[styles.note, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Chai with Rahul"
          placeholderTextColor={c.faint}
          maxLength={80}
          selectionColor={c.primary}
        />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.bg, borderTopColor: c.border }]}>
        {(() => {
          const ready = paise !== null && !!cat;
          const text =
            paise === null
              ? 'Enter an amount'
              : !cat
                ? 'Pick a category to save'
                : `${editId ? 'Update' : 'Save'} · ${formatINR(paise)} on ${cat.label}`;
          return (
            <Pressable
              onPress={save}
              disabled={!ready}
              style={[styles.save, { backgroundColor: ready ? cat!.color : c.chip }]}
            >
              <Text style={[styles.saveText, { color: ready ? '#fff' : c.faint }]}>{text}</Text>
            </Pressable>
          );
        })()}
        {prefill && (
          <TouchableOpacity onPress={ignore} style={styles.ignore}>
            <Text style={[styles.ignoreText, { color: c.muted }]}>Not an expense? Ignore this payment</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 24 },
  surface: { borderRadius: radius.lg },
  amountCard: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  amountCaption: { fontSize: 13, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  rupee: { fontSize: 38, fontWeight: '700', marginRight: 4 },
  amountInput: { fontSize: 52, fontWeight: '800', minWidth: 60, textAlign: 'left', paddingVertical: 0 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' },
  quick: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  quickText: { fontSize: 13.5, fontWeight: '800' },

  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginTop: 22, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cat: { width: '31.5%', alignItems: 'center', justifyContent: 'center', height: 82, borderRadius: radius.md, gap: 6 },
  catText: { fontSize: 12.5, fontWeight: '700' },

  segment: { flexDirection: 'row', padding: 4 },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md },
  segText: { fontSize: 13.5, fontWeight: '700' },

  dateRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 11, borderRadius: radius.pill, borderWidth: 1.5 },
  dateText: { fontSize: 13.5, fontWeight: '700' },

  note: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, padding: 12, marginBottom: 12 },
  bannerTitle: { fontSize: 13.5, fontWeight: '800' },
  bannerSub: { fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  ignore: { alignItems: 'center', paddingTop: 12 },
  ignoreText: { fontSize: 13.5, fontWeight: '700' },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  save: { height: 54, borderRadius: radius.md + 2, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 16, fontWeight: '800' },
});
