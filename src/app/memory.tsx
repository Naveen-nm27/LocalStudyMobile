import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Dialog, StudyDialog, type DialogSpec } from '../components/StudyDialog';
import { Badge, Button, Card, colors, Empty, Icon, Page, PageHeading, SectionTitle, StudyContent } from '../components/ui';
import { projectReviews } from '../data/reviewSchedule';
import { studyRepository } from '../data/studyRepository';
import { formatDay, plural, reviewCount, sessionTime, topicStatus } from '../study/format';
import { useStudy, useTopicSessions } from '../study/StudyProvider';

export default function MemoryScreen() {
  const router = useRouter();
  const { topic: topicParam } = useLocalSearchParams<{ topic?: string }>();
  const { subjects, topics, today, busy } = useStudy();
  const [picker, setPicker] = useState(false);
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const [selected, setSelected] = useState<number>();
  const names = new Map(subjects.map((subject) => [subject.id, subject]));
  const topic = topics.find((item) => String(item.id) === topicParam)
    ?? topics.find((item) => names.get(item.subjectId)?.archivedAt === null)
    ?? topics[0];
  const subject = topic && names.get(topic.subjectId);
  const archived = subject !== undefined && subject.archivedAt !== null;
  const { sessions, loading, error, reload } = useTopicSessions(topic?.id);
  const activeSession = sessions.find((session) => session.id === selected);
  const reviews = topic ? projectReviews(topic) : [];
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
    setPicker(false);
  }

  return <Page>
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
          <Card>
            <SectionTitle>Review schedule</SectionTitle>
            {reviews.length ? <>
              <Text style={styles.meta}>Dates assume each review is completed on time.</Text>
              {reviews.map((review, index) => <View style={styles.row} key={review.number}>
                <View style={styles.reviewMark}><Text style={styles.reviewNumber}>{review.number}</Text></View>
                <View style={styles.summaryCopy}><Text style={styles.rowTitle}>{review.final ? 'Final review' : `Review ${review.number}`}</Text>
                  <Text style={styles.meta}>{formatDay(review.day, { month: 'short', day: 'numeric', year: 'numeric' })}</Text></View>
                {index === 0 && <Badge label={review.day < today ? 'Overdue' : review.day === today ? 'Today' : 'Next'} tone={review.day <= today ? 'orange' : 'gold'} />}
              </View>)}
            </> : <Text style={styles.meta}>{topic.completedAt !== null ? 'All six scheduled reviews are complete.' : 'The first review is due one day after your initial study.'}</Text>}
          </Card>
          <Card>
            <SectionTitle>Session history</SectionTitle>
            <Text style={styles.meta}>{sessions.length ? plural(sessions.length, 'session') : 'Logged sessions will appear here.'}</Text>
            {sessions.map((session) => <View key={session.id} style={[styles.row, activeSession?.id === session.id && styles.selected]}>
              <Icon name="clock" color={colors.purple} size={18} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Select session on ${formatDay(session.studyDay)}`} onPress={() => setSelected(session.id)} style={styles.summaryCopy}>
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
  row: { borderTopWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', minHeight: 53, paddingVertical: 8, gap: 8 },
  selected: { backgroundColor: colors.softPlum, borderRadius: 8, paddingHorizontal: 8 },
  reviewMark: { width: 27, height: 27, borderRadius: 8, backgroundColor: colors.softPlum, alignItems: 'center', justifyContent: 'center' },
  reviewNumber: { color: colors.purple, fontSize: 12, fontWeight: '800' },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
});
