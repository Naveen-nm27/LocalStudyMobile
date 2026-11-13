import { runDatabaseOperation } from './database';
import type { ReviewSchedule } from './reviewSchedule';

export type Subject = {
  id: number;
  name: string;
  archivedAt: number | null;
};

export type Topic = ReviewSchedule & {
  id: number;
  subjectId: number;
  name: string;
};

function normalizeName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new Error('A name is required.');
  return normalized;
}

export const studyRepository = {
  listSubjects() {
    return runDatabaseOperation((db) =>
      db.getAllAsync<Subject>('SELECT * FROM subjects ORDER BY archivedAt IS NOT NULL, name COLLATE NOCASE, id'),
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

  async setSubjectArchived(subjectId: number, archived: boolean): Promise<void> {
    await runDatabaseOperation(async (db) => {
      const result = await db.runAsync(
        'UPDATE subjects SET archivedAt = CASE WHEN ? THEN COALESCE(archivedAt, ?) END WHERE id = ?',
        archived ? 1 : 0,
        Date.now(),
        subjectId,
      );
      if (!result.changes) throw new Error('Subject not found.');
    });
  },

  listTopics(subjectId: number) {
    return runDatabaseOperation((db) =>
      db.getAllAsync<Topic>('SELECT * FROM topics WHERE subjectId = ? ORDER BY name COLLATE NOCASE, id', subjectId),
    );
  },

  async createTopic(subjectId: number, name: string): Promise<number> {
    const normalized = normalizeName(name);
    return runDatabaseOperation(async (db) => {
      const result = await db.runAsync('INSERT INTO topics (subjectId, name) VALUES (?, ?)', subjectId, normalized);
      return result.lastInsertRowId;
    });
  },

  async renameTopic(topicId: number, name: string): Promise<void> {
    const normalized = normalizeName(name);
    await runDatabaseOperation(async (db) => {
      const result = await db.runAsync('UPDATE topics SET name = ? WHERE id = ?', normalized, topicId);
      if (!result.changes) throw new Error('Topic not found.');
    });
  },
};
