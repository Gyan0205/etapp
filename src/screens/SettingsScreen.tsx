import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SectionHeader } from '../components/ui';
import {
  disableDetection,
  enableDetection,
  getEnabledAt,
  getPendingPayments,
  getPermissionState,
  isSupported,
  sendTestNotification,
} from '../services/upiDetect';
import { cardShadow, radius, useColors } from '../theme';

function StatusRow({ label, ok, fix }: { label: string; ok: boolean; fix?: boolean }) {
  const c = useColors();
  return (
    <View style={styles.statusRow}>
      <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={20} color={ok ? c.good : c.danger} />
      <Text style={[styles.statusLabel, { color: c.text }]}>{label}</Text>
      {!ok && fix && (
        <Pressable onPress={() => Linking.openSettings()}>
          <Text style={[styles.link, { color: c.primary }]}>Fix</Text>
        </Pressable>
      )}
    </View>
  );
}

export function SettingsScreen() {
  const c = useColors();
  const [on, setOn] = useState(false);
  const [perm, setPerm] = useState({ sms: false, notifications: false });
  const [busy, setBusy] = useState(false);
  const [scanMsg, setScanMsg] = useState('');

  const refresh = useCallback(async () => {
    setOn((await getEnabledAt()) !== null);
    setPerm(await getPermissionState());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        const r = await enableDetection();
        if (!r.ok) {
          Alert.alert(
            'SMS access needed',
            'To spot UPI payments the app needs permission to read your bank SMS. The messages are only read on your phone and are never uploaded.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open settings', onPress: () => Linking.openSettings() },
            ],
          );
        } else if (!r.notifications) {
          Alert.alert(
            'Notifications are off',
            'Detection is on, but without notification permission you will only see detected payments on the Home screen, not as a pop-up.',
            [
              { text: 'OK', style: 'cancel' },
              { text: 'Open settings', onPress: () => Linking.openSettings() },
            ],
          );
        }
      } else {
        await disableDetection();
      }
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const scan = async () => {
    setScanMsg('Scanning…');
    const found = await getPendingPayments();
    setScanMsg(
      found.length === 0
        ? 'No new UPI payments found in your messages.'
        : `${found.length} payment${found.length === 1 ? '' : 's'} waiting. Check the Home tab.`,
    );
  };

  const card = [styles.card, { backgroundColor: c.card }, cardShadow(c)];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: c.text }]}>Settings</Text>

        <SectionHeader left="UPI payment detection" />
        {!isSupported ? (
          <View style={card}>
            <Text style={[styles.body, { color: c.muted }]}>
              Payment detection works only in the installed Android app, not in Expo Go or on other platforms.
            </Text>
          </View>
        ) : (
          <>
            <View style={card}>
              <View style={styles.toggleRow}>
                <View style={[styles.iconBubble, { backgroundColor: c.primarySoft }]}>
                  <Ionicons name="flash" size={22} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: c.text }]}>Auto-detect UPI payments</Text>
                  <Text style={[styles.body, { color: c.muted }]}>
                    When you pay with PhonePe, Paytm or Google Pay, your bank sends a debit SMS. The app reads it, asks if
                    you want to add it, and fills in the amount, payee and transaction ID. You just pick the category.
                  </Text>
                </View>
                <Switch
                  value={on}
                  onValueChange={toggle}
                  disabled={busy}
                  trackColor={{ true: c.primary + '88', false: c.chip }}
                  thumbColor={on ? c.primary : c.faint}
                />
              </View>

              {on && (
                <View style={[styles.statusBox, { borderTopColor: c.border }]}>
                  <StatusRow label="SMS access" ok={perm.sms} fix />
                  <StatusRow label="Notification pop-ups" ok={perm.notifications} fix />
                </View>
              )}
            </View>

            {on && (
              <View style={[card, { marginTop: 12 }]}>
                <Pressable onPress={sendTestNotification} style={[styles.action, { backgroundColor: c.chip }]}>
                  <Ionicons name="notifications-outline" size={18} color={c.text} />
                  <Text style={[styles.actionText, { color: c.text }]}>Send a test notification</Text>
                </Pressable>
                <Pressable onPress={scan} style={[styles.action, { backgroundColor: c.chip, marginTop: 8 }]}>
                  <Ionicons name="scan-outline" size={18} color={c.text} />
                  <Text style={[styles.actionText, { color: c.text }]}>Scan messages now</Text>
                </Pressable>
                {!!scanMsg && <Text style={[styles.scanMsg, { color: c.muted }]}>{scanMsg}</Text>}
              </View>
            )}

            <SectionHeader left="Good to know" />
            <View style={card}>
              <Text style={[styles.body, { color: c.muted }]}>
                {'•'} Your messages are read only on this phone. Nothing is uploaded.{'\n'}
                {'•'} Only UPI debit messages from your bank are used; other SMS are ignored.{'\n'}
                {'•'} Payments made before you turned this on are not picked up.{'\n'}
                {'•'} If pop-ups do not appear, your phone may be limiting background apps. Allow auto-start and turn
                off battery optimisation for Expense Tracker.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', paddingTop: 8 },
  card: { borderRadius: radius.lg, padding: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBubble: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15.5, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  statusBox: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  link: { fontSize: 14, fontWeight: '800' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 14, borderRadius: radius.md },
  actionText: { fontSize: 14.5, fontWeight: '700' },
  scanMsg: { fontSize: 13, fontWeight: '600', marginTop: 10, paddingHorizontal: 4 },
});
