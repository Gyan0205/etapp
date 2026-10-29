import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDb = (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('expenses.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount_paise INTEGER NOT NULL,
          category TEXT NOT NULL,
          mode TEXT NOT NULL DEFAULT 'UPI',
          note TEXT NOT NULL DEFAULT '',
          date TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      `);
      // v1.5: transaction id for payments detected from SMS, ignored-payment list, settings.
      const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(expenses)');
      if (!cols.some((c) => c.name === 'txn_id')) {
        await db.execAsync("ALTER TABLE expenses ADD COLUMN txn_id TEXT NOT NULL DEFAULT ''");
      }
      await db.execAsync(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_expenses_txn ON expenses(txn_id) WHERE txn_id != '';
        CREATE TABLE IF NOT EXISTS seen_txns (
          txn_id TEXT PRIMARY KEY,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
};
