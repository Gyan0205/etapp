const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** paise (integer) -> "₹1,234.50" */
export const formatINR = (paise: number): string => `₹${inr.format(paise / 100)}`;

const pad = (n: number) => String(n).padStart(2, '0');

/** Date -> local "YYYY-MM-DD" */
export const toDateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Date -> local "YYYY-MM" */
export const toMonthKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export const fromDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addMonths = (monthKey: string, delta: number): string => {
  const [y, m] = monthKey.split('-').map(Number);
  return toMonthKey(new Date(y, m - 1 + delta, 1));
};

export const monthLabel = (monthKey: string): string => {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const dayLabel = (dateKey: string): string => {
  const today = toDateKey(new Date());
  const yest = toDateKey(new Date(Date.now() - 86400000));
  if (dateKey === today) return 'Today';
  if (dateKey === yest) return 'Yesterday';
  return fromDateKey(dateKey).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

/** "123.45" -> 12345 paise; returns null if invalid or <= 0 */
export const parseRupeesToPaise = (text: string): number | null => {
  const t = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const paise = Math.round(parseFloat(t) * 100);
  return paise > 0 ? paise : null;
};

export const addDays = (d: Date, delta: number): Date => {
  const n = new Date(d);
  n.setDate(n.getDate() + delta);
  return n;
};

export const daysInMonthSoFar = (monthKey: string): number => {
  const now = new Date();
  if (toMonthKey(now) === monthKey) return now.getDate();
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
