import { ScrollView, StyleSheet, Text } from 'react-native';

export function EmptyState({ title }: { title: string }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: '#202824',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
});
