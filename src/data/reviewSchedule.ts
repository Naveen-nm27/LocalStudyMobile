const reviewGaps = [1, 3, 7, 14, 30, 60] as const;

export type StudySession = {
  studyDay: string;
  completedAt: number;
};

export type ReviewSchedule = {
  nextReviewDay: string | null;
  completedAt: number | null;
  reviewsCompleted: number;
};

export function toStudyDay(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new Error('A valid study date is required.');
  }

  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(studyDay: string, days: number): string {
  const date = new Date(`${studyDay}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calculateReviewSchedule(sessions: readonly StudySession[]): ReviewSchedule {
  const ordered = [...sessions].sort(
    (a, b) => a.studyDay.localeCompare(b.studyDay) || a.completedAt - b.completedAt,
  );
  const initial = ordered[0];

  if (!initial) {
    return { nextReviewDay: null, completedAt: null, reviewsCompleted: 0 };
  }

  let reviewsCompleted = 0;
  let nextReviewDay = addDays(initial.studyDay, reviewGaps[0]);

  for (const session of ordered.slice(1)) {
    if (session.studyDay < nextReviewDay) continue;

    reviewsCompleted += 1;
    if (reviewsCompleted === reviewGaps.length) {
      return { nextReviewDay: null, completedAt: session.completedAt, reviewsCompleted };
    }

    nextReviewDay = addDays(session.studyDay, reviewGaps[reviewsCompleted]);
  }

  return { nextReviewDay, completedAt: null, reviewsCompleted };
}
