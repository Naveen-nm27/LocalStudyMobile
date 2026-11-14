import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Badge, Button, Card, colors, decorativeSvg, Empty, Icon, Page, SectionTitle, StudyContent, type IconName } from '../components/ui';
import { formatDay, plural, topicStatus } from '../study/format';
import { useStudy } from '../study/StudyProvider';

function Sunset() {
  return <Svg width="100%" height="100%" viewBox="0 0 390 210" preserveAspectRatio="xMaxYMid slice" {...decorativeSvg}>
    <Defs><LinearGradient id="sunset" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#ffcf65" /><Stop offset="1" stopColor="#f28243" /></LinearGradient></Defs>
    <Circle cx={250} cy={100} r={105} stroke="#ac687b" opacity={0.22} />
    <Circle cx={250} cy={100} r={83} stroke="#ac687b" opacity={0.34} />
    <Circle cx={250} cy={100} r={62} fill="url(#sunset)" />
    <Path d="M0 180L75 151l55-18 45 12 64-35 56 28 40-22 55 24v70H0Z" fill="#713355" />
    <Path d="M0 193l90-30 72 6 64-20 84 18 80-20v63H0Z" fill="#4b254c" />
    <Path d="M0 210l93-25 78 7 75-10 72 5 72-17v40Z" fill="#301936" />
    <Rect x={149} y={54} width={3} height={3} rx={1.5} fill="#f8ca8e" /><Circle cx={350} cy={65} r={2} fill="#f8ca8e" />
  </Svg>;
}

export default function TodayScreen() {
  const router = useRouter();
  const { subjects, topics, today } = useStudy();
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const active = subjects.filter((subject) => subject.archivedAt === null);
  const names = new Map(active.map((subject) => [subject.id, subject.name]));
  const activeTopics = topics.filter((topic) => names.has(topic.subjectId));
  const due = activeTopics.filter((topic) => topic.nextReviewDay && topic.nextReviewDay <= today)
    .sort((a, b) => (a.nextReviewDay ?? '').localeCompare(b.nextReviewDay ?? ''));
  const upcoming = activeTopics.filter((topic) => topic.nextReviewDay && topic.nextReviewDay > today)
    .sort((a, b) => (a.nextReviewDay ?? '').localeCompare(b.nextReviewDay ?? '')).slice(0, 4);
  const openTopic = (id: number) => router.push({ pathname: '/memory', params: { topic: String(id) } });
  const stats: { value: number; label: string; icon: IconName; color: string }[] = [
    { value: due.length, label: 'Due reviews', icon: 'clock', color: colors.action },
    { value: activeTopics.length, label: 'Library topics', icon: 'layers', color: colors.purple },
    { value: activeTopics.filter((topic) => topic.completedAt !== null).length, label: 'Completed', icon: 'check', color: '#315f42' },
  ];

  return <Page>
    <View style={styles.hero}>
      <View style={[styles.art, !wide && styles.artSmall]} pointerEvents="none"><Sunset /></View>
      <View style={styles.heroCopy}>
        <Text style={styles.date}>{formatDay(today, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</Text>
        <Text accessibilityRole="header" style={[styles.heroTitle, !wide && { fontSize: 36 }]}>Today</Text>
        <Text style={styles.heroText}>See what’s due and keep your study schedule moving.</Text>
        <Button label="Open library" icon="arrow" tone="light" onPress={() => router.push('/library')} />
      </View>
    </View>
    <StudyContent>
      <View style={styles.stats}>{stats.map(({ label, value, icon, color }) => <View style={styles.stat} key={label}>
        <Icon name={icon} size={20} color={color} /><Text style={styles.statValue}>{value}</Text><Text style={[styles.statLabel, width < 360 && { fontSize: 11 }]}>{label}</Text>
      </View>)}</View>
      <View style={[styles.columns, wide && { flexDirection: 'row' }]}>
        <View style={[styles.column, wide && { flex: 1.5 }]}>
          <SectionTitle>Review queue</SectionTitle>
          <Card>{due.length ? due.map((topic) => <Pressable key={topic.id} accessibilityRole="button" onPress={() => openTopic(topic.id)} style={styles.topic}>
            <View style={styles.topicCopy}><Text style={styles.topicName}>{topic.name}</Text><Text style={styles.statLabel}>{names.get(topic.subjectId)}</Text></View>
            <Badge {...topicStatus(topic, today)} /><Icon name="chevron" color={colors.muted} size={16} />
          </Pressable>) : <Empty icon="clock" title="No reviews due" detail={activeTopics.length ? 'Upcoming reviews will appear here when they’re due.' : 'Add a topic and log your first study session to start its review schedule.'} />}</Card>
        </View>
        <View style={[styles.column, wide && { flex: 1 }]}>
          <SectionTitle>Up next</SectionTitle>
          <Card>{upcoming.length ? upcoming.map((topic) => <Pressable key={topic.id} accessibilityRole="button" onPress={() => openTopic(topic.id)} style={styles.topic}>
            <View style={styles.topicCopy}><Text style={styles.topicName}>{topic.name}</Text><Text style={styles.statLabel}>{plural(topic.reviewsCompleted, 'review')} completed</Text></View>
            <Badge {...topicStatus(topic, today)} />
          </Pressable>) : <Empty icon="layers" title="Nothing scheduled" detail="Your next review appears here after a study session." />}</Card>
        </View>
      </View>
    </StudyContent>
  </Page>;
}

const styles = StyleSheet.create({
  hero: { minHeight: 221, position: 'relative', overflow: 'hidden', borderRadius: 22, backgroundColor: '#301936' },
  art: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '58%' },
  artSmall: { width: '64%', opacity: 0.43 },
  heroCopy: { padding: 23, alignItems: 'flex-start', gap: 9, maxWidth: 385 },
  date: { color: '#ffd185', fontSize: 10, letterSpacing: 1.7, fontWeight: '800' },
  heroTitle: { color: '#fff7ee', fontSize: 50, fontWeight: '900', letterSpacing: -2.2 },
  heroText: { color: '#ead6e4', fontSize: 14, lineHeight: 20, marginBottom: 4, maxWidth: 270 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, gap: 4, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingVertical: 12, paddingHorizontal: 9 },
  statValue: { fontSize: 25, fontWeight: '800', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.muted },
  columns: { gap: 16 }, column: { minWidth: 0, gap: 10 },
  topic: { flexDirection: 'row', alignItems: 'center', minHeight: 49, gap: 9 },
  topicCopy: { flex: 1, gap: 4 }, topicName: { color: colors.ink, fontSize: 15, fontWeight: '800' },
});
