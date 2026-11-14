import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StudyDialog, type DialogSpec } from '../components/StudyDialog';
import { Badge, Button, Card, colors, Empty, Icon, Page, PageHeading, SectionTitle, StudyContent } from '../components/ui';
import { studyRepository, type Subject, type Topic } from '../data/studyRepository';
import { plural, topicStatus } from '../study/format';
import { useStudy } from '../study/StudyProvider';

const subjectColors = [colors.plum, '#ad4c26', '#6350a3', '#46705f', '#a63158'];

export default function LibraryScreen() {
  const router = useRouter();
  const { subjects, topics, today, busy, loading, loadError } = useStudy();
  const [dialog, setDialog] = useState<DialogSpec | null>(null);
  const active = subjects.filter((subject) => subject.archivedAt === null);
  const archived = subjects.filter((subject) => subject.archivedAt !== null);

  function editSubject(subject?: Subject) {
    setDialog({ title: subject ? 'Rename subject' : 'New subject', confirm: subject ? 'Save name' : 'Create subject',
      field: { label: 'Subject name', initial: subject?.name, placeholder: 'e.g. Biology' },
      submit: (name) => subject ? studyRepository.renameSubject(subject.id, name) : studyRepository.createSubject(name) });
  }

  function editTopic(subject: Subject, topic?: Topic) {
    setDialog({ title: topic ? 'Rename topic' : 'New topic', confirm: topic ? 'Save name' : 'Create topic',
      field: { label: 'Topic name', initial: topic?.name, placeholder: 'e.g. Cell structure' },
      submit: (name) => topic ? studyRepository.renameTopic(topic.id, name) : studyRepository.createTopic(subject.id, name) });
  }

  function changeArchive(subject: Subject) {
    const archive = subject.archivedAt === null;
    setDialog({ title: archive ? 'Archive subject?' : 'Restore subject?', confirm: archive ? 'Archive' : 'Restore',
      description: archive ? 'Its topics will be hidden from the review queue. You can restore the subject and its history anytime.' : 'Its topics will return to your review queue and can be studied again.',
      submit: () => studyRepository.setSubjectArchived(subject.id, archive) });
  }

  function subjectCard(subject: Subject) {
    const subjectTopics = topics.filter((topic) => topic.subjectId === subject.id);
    const isArchived = subject.archivedAt !== null;
    const accent = subjectColors[subject.id % subjectColors.length];

    return <Card key={subject.id}>
      <View style={styles.subjectHeader}>
        <View style={styles.subjectMark}><Icon name="book" color={accent} /></View>
        <View style={styles.copy}><Text style={styles.subjectTitle}>{subject.name}</Text><Text style={styles.detail}>{plural(subjectTopics.length, 'topic')}</Text></View>
        {!isArchived && <Button label="Add topic" icon="plus" tone="secondary" disabled={busy} onPress={() => editTopic(subject)} />}
      </View>
      {subjectTopics.map((topic) => <View key={topic.id} style={styles.topicRow}>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/memory', params: { topic: String(topic.id) } })} style={styles.topicLink}>
          <Text style={styles.topicName}>{topic.name}</Text><Badge {...topicStatus(topic, today)} /><Icon name="chevron" size={16} color={colors.muted} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Rename ${topic.name}`} disabled={busy} onPress={() => editTopic(subject, topic)} style={styles.editButton}><Icon name="edit" size={17} color={colors.purple} /></Pressable>
      </View>)}
      {!subjectTopics.length && <Text style={styles.detail}>No topics yet.</Text>}
      <View style={styles.actions}>
        <Button label="Rename" icon="edit" tone="secondary" disabled={busy} onPress={() => editSubject(subject)} />
        <Button label={isArchived ? 'Restore' : 'Archive'} icon="archive" tone="secondary" disabled={busy} onPress={() => changeArchive(subject)} />
      </View>
    </Card>;
  }

  return <Page>
    <PageHeading title="Library" description="Organize the subjects and topics you want to remember."
      action={<Button label="New subject" icon="plus" disabled={busy || loading || !!loadError} onPress={() => editSubject()} />} />
    <StudyContent>
      <View style={styles.section}><SectionTitle>Subjects</SectionTitle>
        {active.length ? active.map(subjectCard) : <Card><Empty icon="book" title="No active subjects" detail="Create a subject, then add your first topic." /></Card>}
      </View>
      {!!archived.length && <View style={styles.section}><SectionTitle>Archived subjects</SectionTitle>{archived.map(subjectCard)}</View>}
    </StudyContent>
    {dialog && <StudyDialog spec={dialog} onClose={() => setDialog(null)} />}
  </Page>;
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  subjectHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  subjectMark: { backgroundColor: colors.softPlum, width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 3 },
  subjectTitle: { fontSize: 20, color: colors.ink, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 13 },
  topicRow: { borderTopWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 },
  topicLink: { minHeight: 49, paddingVertical: 5, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  topicName: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '700' },
  editButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
