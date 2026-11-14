import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, colors, Icon, SectionTitle } from './ui';
import { useStudy } from '../study/StudyProvider';

export type DialogSpec = {
  title: string;
  confirm: string;
  description?: string;
  field?: { label: string; initial?: string; placeholder?: string };
  danger?: boolean;
  submit: (value: string) => Promise<unknown>;
};

export function StudyDialog({ spec, onClose }: { spec: DialogSpec; onClose: () => void }) {
  const [value, setValue] = useState(spec.field?.initial ?? '');
  const [error, setError] = useState<string | null>(null);
  const { busy, mutate } = useStudy();
  const disabled = busy || (spec.field !== undefined && !value.trim());

  async function submit() {
    if (disabled) return;
    setError(null);
    try {
      await mutate(() => spec.submit(value));
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Couldn’t save. Please try again.');
    }
  }

  const dismiss = () => { if (!busy) onClose(); };
  return <Dialog title={spec.title} onClose={dismiss}>
    {spec.description && <Text style={styles.description}>{spec.description}</Text>}
    {spec.field && <View style={{ gap: 7 }}>
      <Text style={styles.label}>{spec.field.label}</Text>
      <TextInput accessibilityLabel={spec.field.label} autoFocus value={value} onChangeText={setValue} editable={!busy}
        maxLength={120} placeholder={spec.field.placeholder} placeholderTextColor={colors.muted}
        onSubmitEditing={() => void submit()} returnKeyType="done" style={styles.input} />
    </View>}
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <View style={styles.actions}>
      <Button label="Cancel" tone="secondary" disabled={busy} onPress={dismiss} />
      <Button label={busy ? 'Saving…' : spec.confirm} tone={spec.danger ? 'danger' : 'primary'} disabled={disabled} onPress={() => void submit()} />
    </View>
  </Dialog>;
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={onClose} />
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.header}><SectionTitle>{title}</SectionTitle>
          <Pressable accessibilityRole="button" accessibilityLabel="Close dialog" hitSlop={10} onPress={onClose}><Icon name="close" /></Pressable>
        </View>
        {children}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#21112e80', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sheet: { width: '100%', maxWidth: 490, maxHeight: '90%', borderRadius: 20, padding: 22, backgroundColor: colors.card, gap: 15 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  label: { color: colors.ink, fontWeight: '700', fontSize: 13 },
  input: { minHeight: 47, paddingHorizontal: 12, color: colors.ink, borderColor: colors.border, borderWidth: 1, borderRadius: 10, backgroundColor: colors.paper, fontSize: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  error: { color: '#a42642', fontSize: 13 },
});
