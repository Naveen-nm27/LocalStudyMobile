import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { calculateReviewSchedule, reviewGaps, type projectReviews, type SessionKind } from '../data/reviewSchedule';
import type { Session } from '../data/studyRepository';
import { formatDay, plural, sessionTime } from '../study/format';
import { Button, Dot, colors, decorativeSvg } from './ui';

const dayMs = 86_400_000;
const dateLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const filters = [{ label: '7 days', days: 7 }, { label: '30 days', days: 30 }, { label: 'All history', days: null }] as const;
const height = 230;
const left = 38;
const top = 23;
const bottom = 195;
const reviewColor = '#ae710d';
const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' } as const;

export function ForgettingCurve({ sessions, today, reviews, selectedReview, onSelectReview, selectedSession, onSelect }: {
  sessions: Session[]; today: string; reviews: ReturnType<typeof projectReviews>; selectedReview?: string;
  onSelectReview: (day: string | undefined) => void; selectedSession?: number; onSelect: (sessionId: number | undefined) => void;
}) {
  const [width, setWidth] = useState(360);
  const [fullSchedule, setFullSchedule] = useState(false);
  const [days, setDays] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number>();
  const [focused, setFocused] = useState<number>();
  const range = selectedReview ? null : days;
  const showAllReviews = fullSchedule || (selectedReview !== undefined && selectedReview !== reviews[0]?.day);
  const { ordered, kinds } = useMemo(() => {
    const ordered = [...sessions].sort((a, b) => a.completedAt - b.completedAt || a.id - b.id);
    const kinds = new Map<number, SessionKind>();
    calculateReviewSchedule(ordered, (session, kind) => kinds.set(session.completedAt, kind));
    return { ordered, kinds };
  }, [sessions]);
  const right = Math.max(left + 10, width - 20);
  const graph = useMemo(() => {
    const first = ordered[0];
    if (!first) return;
    const endOfToday = new Date(`${today}T00:00:00`);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const markers = (showAllReviews ? reviews : reviews.slice(0, 1)).map((review) => ({
      ...review, time: new Date(`${review.day}T00:00:00`).getTime(),
    }));
    const rangeStart = new Date(endOfToday);
    if (range !== null) rangeStart.setDate(rangeStart.getDate() - range);
    const min = range === null ? Math.min(first.completedAt, markers[0]?.time ?? first.completedAt) - dayMs : rangeStart.getTime();
    const max = range === null ? Math.max(endOfToday.getTime(), ordered[ordered.length - 1].completedAt, ...markers.map(({ time }) => time)) + dayMs : endOfToday.getTime();
    const visible = ordered.filter((session) => session.completedAt >= min && session.completedAt < max);
    const x = (time: number) => left + (time - min) / (max - min) * (right - left);
    const y = (retention: number) => bottom - retention / 100 * (bottom - top);
    const paths = ordered.flatMap((session, index) => {
      const start = Math.max(min, session.completedAt);
      const end = Math.min(max, ordered[index + 1]?.completedAt ?? max);
      if (start >= end) return [];
      const tau = Math.max(5, reviewGaps[Math.min(index, reviewGaps.length - 1)]);
      const line = Array.from({ length: 33 }, (_, point) => {
        const t = start + (end - start) * point / 32;
        return `${point ? 'L' : 'M'}${x(t).toFixed(2)} ${y(100 * Math.exp(-(t - session.completedAt) / (dayMs * tau))).toFixed(2)}`;
      }).join(' ');
      return [{ id: session.id, line, area: `${line} L${x(end)} ${bottom} L${x(start)} ${bottom}Z` }];
    });
    return { visible, min, max, markers: markers.filter(({ time }) => time >= min && time < max), x, y, paths };
  }, [range, showAllReviews, ordered, reviews, right, today]);

  if (!graph) return null;
  const tickCount = width < 375 ? 3 : 4;
  const activeId = hovered ?? focused ?? selectedSession;
  const active = graph.visible.find((session) => session.id === activeId);
  const tooltipWidth = Math.min(226, width);
  const activeReview = graph.markers.find(({ day }) => day === selectedReview);
  const details = (session: Session) => `${formatDay(session.studyDay, dateOptions)} · ${sessionTime.format(session.completedAt)}`;
  const tooltipTime = active?.completedAt ?? activeReview?.time;
  const tooltipTitle = active ? kinds.get(active.completedAt) : activeReview && (activeReview.final ? 'Final review' : `Review ${activeReview.number}`);
  const tooltipDetail = active ? details(active) : activeReview && formatDay(activeReview.day, dateOptions);

  return <View style={styles.chart} onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}>
    <View accessibilityLabel="Chart date range" style={styles.filters}>
      {filters.map((filter) => <Pressable key={filter.label} accessibilityRole="button" accessibilityState={{ selected: filter.days === range }}
        onPress={() => { setHovered(undefined); setFocused(undefined); onSelectReview(undefined); setDays(filter.days); }}
        style={[styles.filter, filter.days === range && styles.filterActive]}>
        <Text style={styles.filterLabel}>{filter.label}</Text>
      </Pressable>)}
    </View>
    <View style={styles.plot}>
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} {...decorativeSvg}>
      <Defs><LinearGradient id="retention" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={colors.orange} stopOpacity={0.2} /><Stop offset="1" stopColor={colors.orange} stopOpacity={0.02} /></LinearGradient></Defs>
      {[0, 25, 50, 75, 100].map((level) => <GridLine key={level} level={level} left={left} right={right} y={graph.y(level)} />)}
      {graph.paths.map(({ id, area }) => <Path key={`area-${id}`} d={area} fill="url(#retention)" />)}
      {graph.markers.map(({ day, time }, index) => <Line key={day} x1={graph.x(time)} x2={graph.x(time)} y1={top} y2={bottom}
        stroke={reviewColor} opacity={day === selectedReview || index === 0 ? 1 : 0.48} strokeWidth={day === selectedReview ? 3 : 1.5} strokeDasharray="4 4" />)}
      {graph.paths.map(({ id, line }) => <Path key={id} d={line} fill="none" stroke={colors.orange} strokeWidth={2.4} />)}
      {active && <Line x1={graph.x(active.completedAt)} x2={graph.x(active.completedAt)} y1={top} y2={bottom} stroke={colors.pink} strokeDasharray="3 4" />}
      {Array.from({ length: tickCount }, (_, index) => {
        const time = graph.min + (graph.max - graph.min - 1) * index / (tickCount - 1);
        return <SvgText key={index} x={graph.x(time)} y={height - 12} fill={colors.muted} textAnchor="middle" fontSize={10}>{dateLabel.format(time)}</SvgText>;
      })}
    </Svg>
    {graph.visible.map((session, index) => {
      const x = graph.x(session.completedAt);
      const previous = graph.visible[index - 1];
      const next = graph.visible[index + 1];
      const hitLeft = previous ? Math.max(x - 18, (x + graph.x(previous.completedAt)) / 2) : x - 18;
      const hitRight = next ? Math.min(x + 18, (x + graph.x(next.completedAt)) / 2) : x + 18;
      return <Pressable key={session.id} accessibilityRole="button" accessibilityLabel={`${kinds.get(session.completedAt)}, ${details(session)}`}
        accessibilityState={{ selected: session.id === selectedSession }}
        onHoverIn={() => setHovered(session.id)} onHoverOut={() => setHovered(undefined)}
        onFocus={() => { if (Platform.OS === 'web') setFocused(session.id); }} onBlur={() => setFocused(undefined)}
        onPress={() => {
          setFocused(undefined);
          onSelect(session.id === selectedSession ? undefined : session.id);
        }}
        style={[styles.marker, { left: hitLeft, width: Math.max(1, hitRight - hitLeft) }]}>
        <View pointerEvents="none" style={[styles.markerDot, activeId === session.id && styles.markerActive, { left: x - hitLeft - 5 }]} />
      </Pressable>;
    })}
    {graph.markers.map((review, index) => {
      const x = graph.x(review.time);
      const previous = graph.markers[index - 1];
      const next = graph.markers[index + 1];
      const hitLeft = previous ? Math.max(x - 18, (x + graph.x(previous.time)) / 2) : x - 18;
      const hitRight = next ? Math.min(x + 18, (x + graph.x(next.time)) / 2) : x + 18;
      const selected = review.day === selectedReview;
      const label = review.final ? 'Final review' : `Review ${review.number}`;
      return <Pressable key={review.day} accessibilityRole="button" accessibilityLabel={`${label} marker, ${formatDay(review.day, dateOptions)}`}
        aria-pressed={selected} onPress={() => { setDays(null); setFullSchedule(showAllReviews); onSelectReview(selected ? undefined : review.day); }}
        style={[styles.marker, { top: bottom - 41, left: hitLeft, width: hitRight - hitLeft }]}>
        <View pointerEvents="none" style={[styles.markerDot, styles.reviewDot, selected && styles.markerActive, { left: x - hitLeft - 5 }]} />
      </Pressable>;
    })}
    {tooltipTime !== undefined && <View pointerEvents="none" style={[styles.tooltip, { width: tooltipWidth, left: Math.max(0, Math.min(width - tooltipWidth, graph.x(tooltipTime) - tooltipWidth / 2)) }]}>
      <Text style={styles.tooltipTitle}>{tooltipTitle}</Text>
      <Text style={styles.tooltipDetail}>{tooltipDetail}</Text>
    </View>}
    </View>
    <View style={styles.legend}>
      <View style={styles.item}><Dot color={colors.pink} /><Text style={styles.label}>Study session</Text></View>
      {!!graph.markers.length && <View style={styles.item}><Dot color={reviewColor} /><Text style={styles.label}>{showAllReviews ? 'Review dates' : 'Next review'}</Text></View>}
    </View>
    <Text accessibilityLiveRegion="polite" style={styles.label}>{graph.visible.length ? `${plural(graph.visible.length, 'session')} in view. Tap or select a dot for details.` : 'No sessions in this date range.'}</Text>
    {range === null && reviews.length > 1 && <Button label={showAllReviews ? 'Show next review' : 'Show all review dates'} tone="secondary"
      onPress={() => { if (showAllReviews) onSelectReview(undefined); setDays(null); setFullSchedule(!showAllReviews); }} />}
  </View>;
}

function GridLine({ level, left, right, y }: { level: number; left: number; right: number; y: number }) {
  return <>
    <Line x1={left} x2={right} y1={y} y2={y} stroke={colors.border} strokeWidth={1} />
    <SvgText x={left - 8} y={y + 4} fill={colors.muted} fontSize={10} textAnchor="end">{`${level}%`}</SvgText>
  </>;
}

const styles = StyleSheet.create({
  chart: { width: '100%', gap: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filter: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingHorizontal: 9, minHeight: 38, justifyContent: 'center' },
  filterActive: { backgroundColor: colors.softPlum, borderColor: colors.plum },
  filterLabel: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  plot: { position: 'relative', height },
  marker: { position: 'absolute', top: 0, height: 44 },
  markerDot: { position: 'absolute', top: top - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.pink, borderColor: colors.card, borderWidth: 1 },
  markerActive: { transform: [{ scale: 1.4 }], borderColor: colors.night, borderWidth: 2 },
  reviewDot: { top: 34, backgroundColor: reviewColor },
  tooltip: { position: 'absolute', top: 44, borderRadius: 10, backgroundColor: colors.night, paddingHorizontal: 11, paddingVertical: 8, gap: 2 },
  tooltipTitle: { color: '#fff7f0', fontSize: 13, fontWeight: '800' },
  tooltipDetail: { color: colors.nightMuted, fontSize: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { color: colors.muted, fontSize: 12 },
});
