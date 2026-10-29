import { getDb } from './db';

export interface Expense {
  id: number;
  amountPaise: number;
  category: string;
  mode: string;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  txnId: string;
}

export interface NewExpense {
  amountPaise: number;
  category: string;
  mode: string;
  note: string;
  date: string;
  txnId?: string;
}

interface Row {
  id: number;
  amount_paise: number;
  category: string;
  mode: string;
  note: string;
  date: string;
  created_at: number;
  txn_id: string;
}

const map = (r: Row): Expense => ({
  id: r.id,
  amountPaise: r.amount_paise,
  category: r.category,
  mode: r.mode,
  note: r.note,
  date: r.date,
  createdAt: r.created_at,
  txnId: r.txn_id ?? '',
});

export async function addExpense(e: NewExpense): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO expenses (amount_paise, category, mode, note, date, created_at, txn_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    e.amountPaise, e.category, e.mode, e.note, e.date, Date.now(), e.txnId ?? '',
  );
}

export async function updateExpense(id: number, e: NewExpense): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE expenses SET amount_paise = ?, category = ?, mode = ?, note = ?, date = ? WHERE id = ?',
    e.amountPaise, e.category, e.mode, e.note, e.date, id,
  );
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM expenses WHERE id = ?', id);
}

export async function getExpense(id: number): Promise<Expense | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<Row>('SELECT * FROM expenses WHERE id = ?', id);
  return r ? map(r) : null;
}

export async function getTotalForDate(date: string): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ t: number | null }>(
    'SELECT SUM(amount_paise) AS t FROM expenses WHERE date = ?', date);
  return r?.t ?? 0;
}

/** monthKey = "YYYY-MM" */
export async function getTotalForMonth(monthKey: string): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ t: number | null }>(
    'SELECT SUM(amount_paise) AS t FROM expenses WHERE substr(date, 1, 7) = ?', monthKey);
  return r?.t ?? 0;
}

export async function getExpensesForMonth(monthKey: string): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM expenses WHERE substr(date, 1, 7) = ? ORDER BY date DESC, created_at DESC', monthKey);
  return rows.map(map);
}

export async function getRecent(limit = 5): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM expenses ORDER BY date DESC, created_at DESC LIMIT ?', limit);
  return rows.map(map);
}

export async function getCategoryTotalsForMonth(monthKey: string): Promise<{ category: string; total: number }[]> {
  const db = await getDb();
  return db.getAllAsync<{ category: string; total: number }>(
    'SELECT category, SUM(amount_paise) AS total FROM expenses WHERE substr(date, 1, 7) = ? GROUP BY category ORDER BY total DESC',
    monthKey);
}

export interface ExpenseGroup {
  key: string;
  date: string;
  category: string;
  items: Expense[];
  total: number;
}

/** Groups expenses by day + category, keeping the order of the first occurrence. */
export function groupExpenses(expenses: Expense[]): ExpenseGroup[] {
  const map = new Map<string, ExpenseGroup>();
  for (const e of expenses) {
    const key = `${e.date}|${e.category}`;
    let g = map.get(key);
    if (!g) {
      g = { key, date: e.date, category: e.category, items: [], total: 0 };
      map.set(key, g);
    }
    g.items.push(e);
    g.total += e.amountPaise;
  }
  return [...map.values()];
}

/** Total per day between two YYYY-MM-DD keys (inclusive). Days with no spend are absent. */
export async function getDailyTotals(from: string, to: string): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string; t: number }>(
    'SELECT date, SUM(amount_paise) AS t FROM expenses WHERE date >= ? AND date <= ? GROUP BY date',
    from, to);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.date] = r.t;
  return out;
}
