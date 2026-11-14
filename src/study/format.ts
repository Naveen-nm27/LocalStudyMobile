import { reviewGaps } from '../data/reviewSchedule';
import type { Topic } from '../data/studyRepository';

export function formatDay(day: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
}

export function topicStatus(topic: Topic, today: string) {
  if (topic.completedAt !== null) return { label: 'Complete', tone: 'green' } as const;
  if (!topic.nextReviewDay) return { label: 'New topic', tone: 'plum' } as const;
  if (topic.nextReviewDay < today) return { label: 'Overdue', tone: 'orange' } as const;
  if (topic.nextReviewDay === today) return { label: 'Due today', tone: 'orange' } as const;
  return { label: `Due ${formatDay(topic.nextReviewDay)}`, tone: 'gold' } as const;
}

export const reviewCount = reviewGaps.length;
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
export const sessionTime = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
