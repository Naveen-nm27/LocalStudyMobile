import type { SQLiteDatabase } from 'expo-sqlite';
import { runDatabaseOperation } from './database';
import {
  calculateReviewSchedule,
  toStudyDay,
  type ReviewSchedule,
  type StudySession,
} from './reviewSchedule';

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

export type Session = StudySession & {
  id: number;
  topicId: number;
};

function normalizeName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new Error('A name is required.');
  return normalized;
}

async function refreshSchedule(db: SQLiteDatabase, topicId: number): Promise<void> {
  const sessions = await db.getAllAsync<StudySession>(
    'SELECT completedAt, studyDay FROM sessions WHERE topicId = ?',
    topicId,
  );
  const schedule = calculateReviewSchedule(sessions);
  await db.runAsync(
    'UPDATE topics SET nextReviewDay = ?, completedAt = ?, reviewsCompleted = ? WHERE id = ?',
    schedule.nextReviewDay,
    schedule.completedAt,
    schedule.reviewsCompleted,
    topicId,
  );
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

  listDueTopics(today = toStudyDay(new Date())) {
    return runDatabaseOperation((db) =>
      db.getAllAsync<Topic>(
        `SELECT topics.* FROM topics
         JOIN subjects ON subjects.id = topics.subjectId
         WHERE subjects.archivedAt IS NULL AND topics.nextReviewDay <= ?
         ORDER BY topics.nextReviewDay, topics.id`,
        today,
      ),
    );
  },

  listSessions(topicId: number) {
    return runDatabaseOperation((db) =>
      db.getAllAsync<Session>(
        'SELECT * FROM sessions WHERE topicId = ? ORDER BY studyDay DESC, completedAt DESC, id DESC',
        topicId,
      ),
    );
  },

  async recordSession(topicId: number, completion = new Date()): Promise<void> {
    const studyDay = toStudyDay(completion);
    const completedAt = completion.getTime();

    await runDatabaseOperation((db) =>
      db.withTransactionAsync(async () => {
        const topic = await db.getFirstAsync<{ archivedAt: number | null }>(
          `SELECT subjects.archivedAt FROM topics
           JOIN subjects ON subjects.id = topics.subjectId WHERE topics.id = ?`,
          topicId,
        );
        if (!topic) throw new Error('Topic not found.');
        if (topic.archivedAt !== null) throw new Error('Restore the subject before logging a session.');

        const inserted = await db.runAsync(
          `INSERT INTO sessions (topicId, completedAt, studyDay) VALUES (?, ?, ?)
           ON CONFLICT (topicId, completedAt) DO NOTHING`,
          topicId,
          completedAt,
          studyDay,
        );
        if (inserted.changes) await refreshSchedule(db, topicId);
      }),
    );
  },

  async deleteSession(sessionId: number): Promise<void> {
    await runDatabaseOperation((db) =>
      db.withTransactionAsync(async () => {
        const session = await db.getFirstAsync<{ topicId: number }>(
          'DELETE FROM sessions WHERE id = ? RETURNING topicId',
          sessionId,
        );
        if (session) await refreshSchedule(db, session.topicId);
      }),
    );
  },
};
