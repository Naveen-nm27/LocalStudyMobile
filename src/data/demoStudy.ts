import type { SQLiteDatabase } from 'expo-sqlite';
import { calculateReviewSchedule, toStudyDay } from './reviewSchedule';

export const demoStudyEnabled = __DEV__ && process.env.EXPO_PUBLIC_STUDY_DEMO === '1';

const subjects = [
  { name: 'Biology', topics: [
    { name: 'Cell structure', sessions: [-28, -27, -24, -17, -3] },
    { name: 'Genetics', sessions: [-4] },
    { name: 'Photosynthesis', sessions: [-1] },
  ] },
  { name: 'Statistics', topics: [
    { name: 'Descriptive statistics', sessions: [-115, -114, -111, -104, -90, -60, 0] },
    { name: 'Probability', sessions: [-3, -2] },
    { name: 'Sampling methods', sessions: [] },
  ] },
  { name: 'World History', topics: [
    { name: 'Renaissance trade', sessions: [-12, -11, -8] },
  ] },
  { name: 'French Vocabulary', archived: true, topics: [
    { name: 'Travel phrases', sessions: [-5] },
  ] },
];

export async function seedDemoStudy(db: SQLiteDatabase, now = new Date()) {
  await db.withTransactionAsync(async () => {
    await db.execAsync('CREATE TABLE IF NOT EXISTS demo_seed (id INTEGER PRIMARY KEY)');
    const marker = await db.runAsync('INSERT OR IGNORE INTO demo_seed (id) VALUES (1)');
    if (!marker.changes) return;

    for (const subject of subjects) {
      const { lastInsertRowId: subjectId } = await db.runAsync(
        'INSERT INTO subjects (name, archivedAt) VALUES (?, ?)', subject.name, subject.archived ? now.getTime() : null,
      );

      for (const topic of subject.topics) {
        const sessions = topic.sessions.map((offset) => {
          const date = new Date(now);
          date.setDate(date.getDate() + offset);
          return { studyDay: toStudyDay(date), completedAt: date.getTime() };
        });
        const { nextReviewDay, completedAt, reviewsCompleted } = calculateReviewSchedule(sessions);
        const { lastInsertRowId: topicId } = await db.runAsync(
          `INSERT INTO topics (subjectId, name, nextReviewDay, completedAt, reviewsCompleted)
           VALUES (?, ?, ?, ?, ?)`, subjectId, topic.name, nextReviewDay, completedAt, reviewsCompleted,
        );

        for (const session of sessions) {
          await db.runAsync('INSERT INTO sessions (topicId, completedAt, studyDay) VALUES (?, ?, ?)',
            topicId, session.completedAt, session.studyDay);
        }
      }
    }
  });
}
