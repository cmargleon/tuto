import type Database from 'better-sqlite3';

const hasColumn = (db: Database.Database, tableName: string, columnName: string): boolean => {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === columnName);
};

export const runMigrations = (db: Database.Database): void => {
  if (!hasColumn(db, 'jobs', 'queue_priority')) {
    db.exec("ALTER TABLE jobs ADD COLUMN queue_priority INTEGER NOT NULL DEFAULT 0");
  }
};
