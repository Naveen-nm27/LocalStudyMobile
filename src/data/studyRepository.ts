import { runDatabaseOperation } from './database';

export type Subject = {
  id: number;
  name: string;
  archivedAt: number | null;
};

function normalizeName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new Error('A name is required.');
  return normalized;
}

export const studyRepository = {
  listSubjects() {
    return runDatabaseOperation((db) =>
      db.getAllAsync<Subject>('SELECT * FROM subjects ORDER BY name COLLATE NOCASE, id'),
    );
  },

  async createSubject(name: string): Promise<number> {
    const normalized = normalizeName(name);
    return runDatabaseOperation(async (db) => {
      const result = await db.runAsync('INSERT INTO subjects (name) VALUES (?)', normalized);
      return result.lastInsertRowId;
    });
  },

  async renameSubject(subjectId: number, name: string): Promise<void> {
    const normalized = normalizeName(name);
    await runDatabaseOperation(async (db) => {
      const result = await db.runAsync('UPDATE subjects SET name = ? WHERE id = ?', normalized, subjectId);
      if (!result.changes) throw new Error('Subject not found.');
    });
  },
};
