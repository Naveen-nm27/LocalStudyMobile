import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useStudy } from '../study/StudyProvider';

export const colors = {
  paper: '#f4f0eb', card: '#fffcf8', ink: '#291942', muted: '#6a5874', border: '#e6ddd8',
  purple: '#4f1d6e', night: '#21112e', nightMuted: '#cdbbd4', orange: '#ef5a1b', action: '#a43712',
  gold: '#f8b51b', pink: '#c72c66', plum: '#7e235d', softPlum: '#efe5f3', softOrange: '#fae7db',
};

export type IconName = 'sun' | 'book' | 'curve' | 'plus' | 'chevron' | 'clock' | 'check' | 'layers' | 'close' | 'arrow' | 'edit' | 'archive';
export const decorativeSvg = Platform.OS === 'web' ? { 'aria-hidden': true as const } : { accessible: false };

const iconPaths: Record<IconName, string> = {
  sun: 'M3 18h18M5 14h14M7 14a5 5 0 0 1 10 0M12 3v2M4.5 6.5 6 8m13.5-1.5L18 8',
  book: 'M3 5c4-1 6 0 9 2 3-2 5-3 9-2v13c-4-1-6 0-9 2-3-2-5-3-9-2zM12 7v13',
  curve: 'M3 4v16h18M6 7c1 6 4 8 8 8V8c1 4 3 6 7 6',
  plus: 'M12 5v14M5 12h14', chevron: 'm9 6 6 6-6 6',
  clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  check: 'm5 12 4 4L19 6', layers: 'm12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5',
  close: 'm6 6 12 12M18 6 6 18', arrow: 'M5 12h14m-6-6 6 6-6 6',
  edit: 'm4 16-1 5 5-1L20 8l-4-4L4 16Zm10-10 4 4',
  archive: 'M4 8h16v12H4zM3 4h18v4H3zM10 12h4',
};

export function Icon({ name, color = colors.ink, size = 21 }: { name: IconName; color?: ColorValue; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" {...decorativeSvg}>
    <Path d={iconPaths[name]} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}

export function Brand() {
  return <View style={styles.brand}>
    <View style={styles.brandMark}><Icon name="sun" color={colors.night} size={23} /></View>
    <View><Text style={styles.brandTitle}>Sunset Study</Text><Text style={styles.brandCaption}>LOCAL WORKSPACE</Text></View>
  </View>;
}

export function Page({ children }: { children: ReactNode }) {
  return <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
    <View style={styles.page}>{children}</View>
  </ScrollView>;
}

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <View style={styles.pageHeading}>
    <View style={styles.headingCopy}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
    {action}
  </View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={styles.sectionTitle}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Button({ label, onPress, icon, tone = 'primary', disabled = false }: {
  label: string; onPress: () => void; icon?: IconName; tone?: 'primary' | 'secondary' | 'light' | 'danger'; disabled?: boolean;
}) {
  const foreground = tone === 'primary' ? '#fffaf3' : tone === 'danger' ? '#a42642' : colors.ink;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled}
    style={({ pressed }) => [styles.button, styles[tone], (disabled || pressed) && { opacity: disabled ? 0.5 : 0.78 }]}>
    {icon && <Icon name={icon} size={17} color={foreground} />}
    <Text style={[styles.buttonLabel, { color: foreground }]}>{label}</Text>
  </Pressable>;
}

export function Badge({ label, tone }: { label: string; tone: 'green' | 'plum' | 'gold' | 'orange' }) {
  const palette = { green: ['#e6efe4', '#315f42'], plum: [colors.softPlum, colors.purple], gold: ['#faedcf', '#74500d'], orange: [colors.softOrange, colors.action] };
  return <View style={[styles.badge, { backgroundColor: palette[tone][0] }]}>
    <Text style={[styles.badgeText, { color: palette[tone][1] }]}>{label}</Text>
  </View>;
}

export function Empty({ icon, title, detail, action }: { icon: IconName; title: string; detail: string; action?: ReactNode }) {
  return <View style={styles.empty}>
    <View style={styles.emptyIcon}><Icon name={icon} color={colors.purple} size={24} /></View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyDetail}>{detail}</Text>
    {action}
  </View>;
}

export function StudyContent({ children }: { children: ReactNode }) {
  const { loading, loadError, refresh } = useStudy();
  if (loading) return <ActivityIndicator accessibilityLabel="Loading study data" color={colors.purple} />;
  if (loadError) return <Card><Empty icon="archive" title="Couldn’t load your library" detail={loadError}
    action={<Button label="Retry" tone="secondary" onPress={() => void refresh()} />} /></Card>;
  return children;
}

export function Dot({ color }: { color: string }) {
  return <Svg width={10} height={10} viewBox="0 0 10 10" {...decorativeSvg}><Circle cx={5} cy={5} r={4} fill={color} /></Svg>;
}

export const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandMark: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: 12 },
  brandTitle: { color: '#fff7f0', fontSize: 19, fontWeight: '800', letterSpacing: -0.6 },
  brandCaption: { color: colors.nightMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  scroll: { flex: 1, backgroundColor: colors.paper },
  scrollContent: { flexGrow: 1 },
  page: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: 24, paddingTop: 30, paddingBottom: 42, gap: 22 },
  pageHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14 },
  headingCopy: { flexGrow: 1, flexShrink: 1, gap: 6 },
  title: { color: colors.ink, fontSize: 37, fontWeight: '800', letterSpacing: -1.9 },
  description: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  sectionTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.55 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18, gap: 13 },
  button: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'flex-start' },
  primary: { backgroundColor: colors.action },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  light: { backgroundColor: '#fff2d8' },
  danger: { backgroundColor: '#f9e8ec' },
  buttonLabel: { fontSize: 13, fontWeight: '800' },
  badge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 9 },
  emptyIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: colors.softPlum, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  emptyTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  emptyDetail: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 340 },
});
