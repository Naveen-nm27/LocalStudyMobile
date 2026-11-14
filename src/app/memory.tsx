import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ForgettingCurve } from '../components/ForgettingCurve';
import { Dialog, StudyDialog, type DialogSpec } from '../components/StudyDialog';
import { Badge, Button, Card, colors, Empty, Icon, Page, PageHeading, SectionTitle, StudyContent } from '../components/ui';
import { projectReviews, reviewGaps } from '../data/reviewSchedule';
import { studyRepository } from '../data/studyRepository';
import { formatDay, plural, reviewCount, sessionTime, topicStatus } from '../study/format';
import { useStudy, useTopicSessions } from '../study/StudyProvider';

const dayMs = 86_400_000;

export default function MemoryScreen() {
  const router = useRouter();
  const { topic: topicParam } = useLocalSearchParams<{ topic?: string }>();
  const { subjects, topics, today, busy } = useStudy();
  const { width } = useWindowDimensions();
  const wide = width >= 970 || (width >= 760 && width < 900);
  const [picker, setPicker] = useState(false);
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const [selected, setSelected] = useState<number>();
  const [reviewSelection, setReviewSelection] = useState<{ topicId: number; day: string }>();
  const scroll = useRef<ScrollView>(null);
  const chartTop = useRef(0);
  const names = new Map(subjects.map((subject) => [subject.id, subject]));
  const topic = topics.find((item) => String(item.id) === topicParam)
    ?? topics.find((item) => names.get(item.subjectId)?.archivedAt === null)
    ?? topics[0];
  const subject = topic && names.get(topic.subjectId);
  const archived = subject !== undefined && subject.archivedAt !== null;
  const { sessions, loading, error, reload } = useTopicSessions(topic?.id);
  const activeSession = sessions.find((session) => session.id === selected);
  const reviews = topic ? projectReviews(topic) : [];
  const selectedReview = reviewSelection?.topicId === topic?.id
    ? reviews.find(({ day }) => day === reviewSelection?.day)?.day
    : undefined;
  const studyLabel = !topic?.nextReviewDay && topic?.completedAt === null ? 'Log first study'
    : topic?.nextReviewDay && topic.nextReviewDay <= today ? 'Log review' : 'Log practice';

  function record() {
    if (!topic) return;
    const description = studyLabel === 'Log first study' ? 'Your first review will be due tomorrow.'
      : studyLabel === 'Log review' ? 'This session counts toward your six scheduled reviews.'
      : topic.completedAt !== null ? 'This practice will appear in your session history.' : 'Early practice is saved in your history. Your next review date stays the same.';
    setDialog({ title: studyLabel, confirm: 'Log session', description, submit: () => studyRepository.recordSession(topic.id) });
  }

  function selectTopic(id: number) {
    router.setParams({ topic: String(id) });
    setSelected(undefined);
    setReviewSelection(undefined);
    setPicker(false);
  }

  function selectReview(day: string | undefined) {
    setReviewSelection(topic && day ? { topicId: topic.id, day } : undefined);
    if (day) setSelected(undefined);
  }

  function selectSession(id: number | undefined) {
    setSelected(id);
    if (id !== undefined) setReviewSelection(undefined);
  }

  return <Page scrollRef={scroll}>
    <PageHeading title="Memory" description="Explore your forgetting curve and see when to review each topic." />
    <StudyContent>
      {!topic ? <Card><Empty icon="curve" title="Choose a topic to study" detail="Add a topic to your library to start building its review history."
        action={<Button label="Open library" icon="arrow" onPress={() => router.push('/library')} />} /></Card> : <>
        <Card>
          <View style={styles.summary}>
            <View style={styles.summaryCopy}>
              <Text style={styles.subject}>{subject?.name}{archived ? ' · Archived' : ''}</Text>
              <SectionTitle>{topic.name}</SectionTitle>
              <View style={styles.badges}><Badge {...topicStatus(topic, today)} /><Text style={styles.meta}>{topic.reviewsCompleted} of {reviewCount} reviews</Text></View>
            </View>
            <View style={styles.actions}>
              <Button label="Change topic" icon="layers" tone="secondary" onPress={() => setPicker(true)} />
              {!archived && <Button label={studyLabel} icon="plus" disabled={busy || loading || !!error} onPress={record} />}
            </View>
          </View>
          {archived && <Text style={styles.meta}>Restore this subject in Library to log another session.</Text>}
          <View accessibilityRole="progressbar" accessibilityLabel="Reviews completed" accessibilityValue={{ min: 0, max: reviewCount, now: topic.reviewsCompleted }} style={styles.progress}>
            {Array.from({ length: reviewCount }, (_, index) => <View key={index} style={[styles.segment, index < topic.reviewsCompleted && styles.segmentDone]} />)}
          </View>
        </Card>
        {loading ? <ActivityIndicator accessibilityLabel="Loading session history" color={colors.purple} /> : error ? <Card>
          <Empty icon="clock" title="Couldn’t load sessions" detail={error} action={<Button label="Retry" tone="secondary" onPress={reload} />} />
        </Card> : <>
          <View style={[styles.columns, wide && { flexDirection: 'row' }]} onLayout={(event) => { chartTop.current = event.nativeEvent.layout.y; }}>
            <View style={[styles.column, wide && { flex: 1.8 }]}>
              <Card>
                <SectionTitle>Forgetting curve</SectionTitle>
                {sessions.length ? <>
                  <Text style={styles.meta}>An illustrative model of how recall fades between practice sessions.</Text>
                  <ForgettingCurve key={topic.id} sessions={sessions} today={today} reviews={reviews} selectedReview={selectedReview}
                    onSelectReview={selectReview} selectedSession={activeSession?.id} onSelect={selectSession} />
                </> : <Empty icon="curve" title="No completed sessions yet" detail="Log your first study session to see the curve and projected review dates." />}
              </Card>
            </View>
            <View style={[styles.column, wide && { flex: 1 }]}>
              <Card>
                <SectionTitle>Review schedule</SectionTitle>
                {reviews.length ? <>
                  <Text style={styles.meta}>Dates assume each review is completed on time.</Text>
                  {reviews.map((review, index) => {
                    const expanded = selectedReview === review.day;
                    const label = review.final ? 'Final review' : `Review ${review.number}`;
                    const date = formatDay(review.day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                    const daysAway = (Date.parse(review.day) - Date.parse(today)) / dayMs;
                    const timing = daysAway < 0 ? `${plural(-daysAway, 'day')} overdue`
                      : daysAway > 0 ? `In ${plural(daysAway, 'day')}` : 'Due today';
                    return <View key={review.number} style={expanded && styles.expandedReview}>
                      <Pressable accessibilityRole="button" aria-expanded={expanded} accessibilityLabel={`${label}, ${date}`}
                        onPress={() => selectReview(expanded ? undefined : review.day)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                        <View style={styles.reviewMark}><Text style={styles.reviewNumber}>{review.number}</Text></View>
                        <View style={styles.summaryCopy}><Text style={styles.rowTitle}>{label}</Text>
                          <Text style={styles.meta}>{formatDay(review.day, { month: 'short', day: 'numeric', year: 'numeric' })}</Text></View>
                        {index === 0 && <Badge label={review.day < today ? 'Overdue' : review.day === today ? 'Today' : 'Next'} tone={review.day <= today ? 'orange' : 'gold'} />}
                        <View style={expanded && styles.expandedChevron}><Icon name="chevron" size={15} color={colors.purple} /></View>
                      </Pressable>
                      {expanded && <View style={styles.reviewDetails}>
                        <Text style={styles.meta}>{timing} · {plural(reviewGaps[review.number - 1], 'day')} after {index === 0 ? 'the previous scheduled study' : 'the previous projected review'}</Text>
                        <View style={styles.actions}>
                          {!!sessions.length && <Button label="Show on curve" icon="curve" tone="secondary" onPress={() => scroll.current?.scrollTo({ y: chartTop.current, animated: true })} />}
                          {index === 0 && daysAway <= 0 && !archived && <Button label="Log review" disabled={busy} onPress={record} />}
                        </View>
                      </View>}
                    </View>;
                  })}
                </> : <Text style={styles.meta}>{topic.completedAt !== null ? 'All six scheduled reviews are complete.' : 'The first review is due one day after your initial study.'}</Text>}
              </Card>
            </View>
          </View>
          <Card>
            <SectionTitle>Session history</SectionTitle>
            <Text style={styles.meta}>{sessions.length ? plural(sessions.length, 'session') : 'Logged sessions will appear here.'}</Text>
            {sessions.map((session) => <View key={session.id} style={[styles.row, activeSession?.id === session.id && styles.selected]}>
              <Icon name="clock" color={colors.purple} size={18} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Select session on ${formatDay(session.studyDay)}`} onPress={() => selectSession(session.id)} style={styles.summaryCopy}>
                <Text style={styles.rowTitle}>{formatDay(session.studyDay, { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                <Text style={styles.meta}>{sessionTime.format(session.completedAt)}</Text>
              </Pressable>
              <Button label="Delete" tone="danger" disabled={busy} onPress={() => setDialog({ title: 'Delete session?', confirm: 'Delete session', danger: true,
                description: 'This removes the session and rebuilds the review schedule from the remaining history.', submit: () => studyRepository.deleteSession(session.id) })} />
            </View>)}
          </Card>
        </>}
      </>}
    </StudyContent>
    {picker && <Dialog title="Choose a topic" onClose={() => setPicker(false)}>
      <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
        {topics.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => selectTopic(item.id)} style={[styles.row, item.id === topic?.id && styles.selected]}>
          <View style={styles.summaryCopy}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.meta}>{names.get(item.subjectId)?.name}{names.get(item.subjectId)?.archivedAt != null ? ' · Archived' : ''}</Text></View>
          <Icon name={item.id === topic?.id ? 'check' : 'chevron'} color={colors.purple} size={17} />
        </Pressable>)}
      </ScrollView>
    </Dialog>}
    {dialog && <StudyDialog spec={dialog} onClose={() => setDialog(null)} />}
  </Page>;
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryCopy: { flexGrow: 1, flexShrink: 1, gap: 5 },
  subject: { fontSize: 12, fontWeight: '800', color: colors.plum },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', flexShrink: 1, gap: 8 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  progress: { flexDirection: 'row', gap: 5, marginTop: 5 },
  segment: { flex: 1, height: 5, borderRadius: 6, backgroundColor: colors.softPlum },
  segmentDone: { backgroundColor: colors.plum },
  columns: { alignItems: 'stretch', gap: 15 },
  column: { minWidth: 0 },
  row: { borderTopWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', minHeight: 53, paddingVertical: 8, gap: 8 },
  selected: { backgroundColor: colors.softPlum, borderRadius: 8, paddingHorizontal: 8 },
  expandedReview: { backgroundColor: '#faedcf', borderRadius: 10, paddingHorizontal: 8 },
  expandedChevron: { transform: [{ rotate: '90deg' }] },
  reviewDetails: { gap: 8, paddingBottom: 10 },
  reviewMark: { width: 27, height: 27, borderRadius: 8, backgroundColor: colors.softPlum, alignItems: 'center', justifyContent: 'center' },
  reviewNumber: { color: colors.purple, fontSize: 12, fontWeight: '800' },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
});
