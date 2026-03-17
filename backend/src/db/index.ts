import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from '../config/env';
import { runMigrations } from './migrations';
import { schemaSql } from './schema';

fs.mkdirSync(path.dirname(env.databasePath), { recursive: true });

export const db = new Database(env.databasePath);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.exec(schemaSql);
runMigrations(db);
db.exec(schemaSql);
