import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import UpiSms, { type DetectedPayment } from '../../modules/upi-sms';
import { getDb } from './db';

export type Payment = DetectedPayment & { key: string };

const KEY_ENABLED_AT = 'upi_detect_enabled_at';
const MAX_PENDING = 20;

/** True only on Android builds that include the native SMS module. */
export const isSupported = Platform.OS === 'android' && UpiSms != null;

/** Stable id for a payment: the bank's UPI reference, or a fallback from time + amount. */
export const paymentKey = (p: DetectedPayment): string =>
  p.txnId || `sms-${Math.round(p.timestamp)}-${p.amountPaise}`;

// ---- settings -----------------------------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return r?.value ?? null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  const db = await getDb();
  if (value === null) await db.runAsync('DELETE FROM settings WHERE key = ?', key);
  else await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

/** When detection was switched on (epoch ms), or null if it is off. Only newer SMS are considered. */
export async function getEnabledAt(): Promise<number | null> {
  const v = await getSetting(KEY_ENABLED_AT);
  return v ? Number(v) : null;
}

// ---- permissions --------------------------------------------------------------------------

const needsNotificationPermission = () => Platform.OS === 'android' && Number(Platform.Version) >= 33;

export async function getPermissionState(): Promise<{ sms: boolean; notifications: boolean }> {
  if (!isSupported) return { sms: false, notifications: false };
  const P = PermissionsAndroid.PERMISSIONS;
  const sms =
    (await PermissionsAndroid.check(P.READ_SMS)) && (await PermissionsAndroid.check(P.RECEIVE_SMS));
  const notifications = needsNotificationPermission() ? await PermissionsAndroid.check(P.POST_NOTIFICATIONS) : true;
  return { sms, notifications };
}

export type EnableResult = { ok: boolean; notifications: boolean; reason?: 'unsupported' | 'sms-denied' };

/** Asks for permissions and turns detection on. */
export async function enableDetection(): Promise<EnableResult> {
  if (!isSupported) return { ok: false, notifications: false, reason: 'unsupported' };
  const P = PermissionsAndroid.PERMISSIONS;
  const wanted: Permission[] = [P.READ_SMS, P.RECEIVE_SMS];
  if (needsNotificationPermission()) wanted.push(P.POST_NOTIFICATIONS);
  await PermissionsAndroid.requestMultiple(wanted);

  const state = await getPermissionState();
  if (!state.sms) return { ok: false, notifications: state.notifications, reason: 'sms-denied' };

  if ((await getEnabledAt()) === null) await setSetting(KEY_ENABLED_AT, String(Date.now()));
  UpiSms!.setEnabled(true);
  return { ok: true, notifications: state.notifications };
}

export async function disableDetection(): Promise<void> {
  UpiSms?.setEnabled(false);
  await setSetting(KEY_ENABLED_AT, null);
}

/** Re-applies the saved on/off state to the native side (e.g. after the app updates). */
export async function syncNativeState(): Promise<void> {
  if (!isSupported) return;
  const enabledAt = await getEnabledAt();
  const { sms } = await getPermissionState();
  UpiSms!.setEnabled(enabledAt !== null && sms);
}

// ---- detected payments --------------------------------------------------------------------

async function alreadyHandled(key: string): Promise<boolean> {
  const db = await getDb();
  const saved = await db.getFirstAsync('SELECT 1 FROM expenses WHERE txn_id = ?', key);
  if (saved) return true;
  const seen = await db.getFirstAsync('SELECT 1 FROM seen_txns WHERE txn_id = ?', key);
  return !!seen;
}

export const isAlreadySaved = async (key: string): Promise<boolean> => {
  const db = await getDb();
  return !!(await db.getFirstAsync('SELECT 1 FROM expenses WHERE txn_id = ?', key));
};

/** UPI payments found in the SMS inbox since detection was enabled that are not yet saved or ignored. */
export async function getPendingPayments(): Promise<Payment[]> {
  if (!isSupported) return [];
  const enabledAt = await getEnabledAt();
  if (enabledAt === null) return [];
  const { sms } = await getPermissionState();
  if (!sms) return [];

  let found: DetectedPayment[] = [];
  try {
    found = await UpiSms!.scanInbox(enabledAt);
  } catch {
    return [];
  }

  const out: Payment[] = [];
  const seenKeys = new Set<string>();
  for (const p of found) {
    const key = paymentKey(p);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    if (await alreadyHandled(key)) continue;
    out.push({ ...p, key });
    if (out.length >= MAX_PENDING) break;
  }
  return out;
}

export async function ignorePayment(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR IGNORE INTO seen_txns (txn_id, created_at) VALUES (?, ?)', key, Date.now());
}

export async function sendTestNotification(): Promise<void> {
  await UpiSms?.sendTestNotification();
}

// ---- notification deep link ---------------------------------------------------------------

/** Parses expensetracker://add-upi?amount=5200&payee=..&txn=..&ts=.. into a payment. */
export function parsePaymentUrl(url: string | null | undefined): Payment | null {
  if (!url || !url.startsWith('expensetracker://add-upi')) return null;
  const query = url.split('?')[1] ?? '';
  const params: Record<string, string> = {};
  for (const part of query.split('&')) {
    const [k, v = ''] = part.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  const amountPaise = Number(params.amount);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return null;
  const p: DetectedPayment = {
    amountPaise,
    payee: params.payee ?? '',
    txnId: params.txn ?? '',
    timestamp: Number(params.ts) || Date.now(),
    sender: '',
  };
  return { ...p, key: paymentKey(p) };
}
