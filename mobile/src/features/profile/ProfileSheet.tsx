import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

export function ProfileSheet({ visible, title, busy, onClose, children, closable = true }: {
  visible: boolean; title: string; busy: boolean; closable?: boolean; onClose: () => void; children: React.ReactNode;
}) {
  const { colors: c } = useTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy && closable) onClose(); }}>
    <KeyboardAvoidingView style={profileStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[profileStyles.sheet, { backgroundColor: c.cardBg, borderColor: c.glassBorder }]}>
        <View style={profileStyles.heading}>
          <Text accessibilityRole="header" style={[profileStyles.title, { color: c.textDark }]}>{title}</Text>
          {closable && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Tutup ${title}`} disabled={busy} onPress={onClose} style={profileStyles.iconButton}>
            <Ionicons name="close" size={22} color={c.textMuted} />
          </TouchableOpacity>}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={profileStyles.content}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

export function ProfileSaveButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  const { colors: c } = useTheme();
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress}
    style={[profileStyles.button, { backgroundColor: c.accentSolid, opacity: busy ? 0.6 : 1 }]}>
    {busy ? <ActivityIndicator color={c.accentOnSolid} /> : <Text style={[profileStyles.buttonText, { color: c.accentOnSolid }]}>{label}</Text>}
  </TouchableOpacity>;
}

export const profileStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '92%', borderRadius: 20, borderWidth: 1, padding: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { gap: 16, paddingBottom: 8 },
  group: { gap: 6 }, label: { fontSize: 14, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16 },
  text: { fontSize: 14, lineHeight: 21 },
  button: { minHeight: 48, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700' },
  preview: { width: 160, height: 160, borderRadius: 80, alignSelf: 'center' },
});
