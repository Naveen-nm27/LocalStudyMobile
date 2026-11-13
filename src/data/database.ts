import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const databaseName = 'local-study.db';
const schemaVersion = 1;

const initialSchema = `
  CREATE TABLE subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    archivedAt INTEGER
  );

  CREATE TABLE topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subjectId INTEGER NOT NULL REFERENCES subjects(id),
    name TEXT NOT NULL,
    nextReviewDay TEXT,
    completedAt INTEGER,
    reviewsCompleted INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topicId INTEGER NOT NULL REFERENCES topics(id),
    completedAt INTEGER NOT NULL,
    studyDay TEXT NOT NULL,
    UNIQUE (topicId, completedAt)
  );

  CREATE INDEX topics_by_subject ON topics (subjectId, id);
  CREATE INDEX topics_by_review_day ON topics (nextReviewDay) WHERE nextReviewDay IS NOT NULL;
  PRAGMA user_version = 1;
`;

let database: SQLiteDatabase | undefined;
let pending: Promise<unknown> = Promise.resolve();

async function initializeDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(databaseName, { useNewConnection: true });

  try {
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await db.withTransactionAsync(async () => {
      const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      if (version?.user_version === 0) {
        await db.execAsync(initialSchema);
      } else if (version?.user_version !== schemaVersion) {
        throw new Error(`Unsupported study database version: ${version?.user_version}.`);
      }
    });
    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}

export function runDatabaseOperation<T>(operation: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  // Serialize reads and writes on this private connection so unrelated queries cannot join a transaction.
  const result = pending.then(async () => {
    database ??= await initializeDatabase();
    return operation(database);
  });
  pending = result.catch(() => undefined);
  return result;
}
