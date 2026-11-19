import React, { useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { apiClient } from '@/lib/api/client';
import type { ApiError } from '@/types/api';
import { ProfileSaveButton, ProfileSheet, profileStyles as s } from './ProfileSheet';

export function ChangePasswordModal({ visible, onClose, onSuccessLogout }: {
  visible: boolean; onClose: () => void; onSuccessLogout: () => void;
}) {
  const { colors: c } = useTheme();
  const [values, setValues] = useState(['', '', '']);
  const [shown, setShown] = useState([false, false, false]);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const close = () => {
    if (lock.current) return;
    setValues(['', '', '']); setShown([false, false, false]); setError(''); setSuccess(false);
    onClose();
    if (success) onSuccessLogout();
  };
  const save = async () => {
    if (lock.current) return;
    const [current, next, confirm] = values;
    if (!current) { setError('Kata sandi saat ini wajib diisi.'); return; }
    if (next.length < 8) { setError('Kata sandi baru minimal 8 karakter.'); return; }
    if (next === current) { setError('Kata sandi baru harus berbeda dari kata sandi saat ini.'); return; }
    if (next !== confirm) { setError('Konfirmasi kata sandi baru tidak cocok.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      await apiClient.post('/me/change-password', { current_password: current, new_password: next, new_password_confirmation: confirm });
      setValues(['', '', '']); setSuccess(true);
    } catch (failure) {
      const e = failure as ApiError;
      setError(Object.values(e.fieldErrors || {}).flat().join('\n') || e.message || 'Kata sandi belum dapat diperbarui. Coba lagi.');
    } finally { lock.current = false; setBusy(false); }
  };
  return <ProfileSheet visible={visible} title="Ubah kata sandi" busy={busy} onClose={close}>
    {success ? <>
      <Text style={[s.label, { color: c.textDark }]}>Kata sandi berhasil diperbarui</Text>
      <Text style={[s.text, { color: c.textMuted }]}>Silakan masuk kembali menggunakan kata sandi baru. Seluruh sesi sebelumnya telah diakhiri.</Text>
      <ProfileSaveButton label="Login ulang sekarang" busy={false} onPress={close} />
    </> : <>
      {!!error && <Text accessibilityRole="alert" style={[s.text, { color: c.dangerFg }]}>{error}</Text>}
      {['Kata sandi saat ini', 'Kata sandi baru', 'Konfirmasi kata sandi baru'].map((label, i) => <View key={label} style={s.group}>
        <Text style={[s.label, { color: c.textDark }]}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TextInput accessibilityLabel={label} value={values[i]} onChangeText={value => setValues(prev => prev.map((v, index) => index === i ? value : v))}
            editable={!busy} secureTextEntry={!shown[i]} autoCapitalize="none" autoCorrect={false}
            style={[s.input, { flex: 1, minWidth: 0, color: c.textDark, borderColor: c.borderControl, outlineColor: c.accentSolid }]} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${shown[i] ? 'Sembunyikan' : 'Tampilkan'} ${label.toLowerCase()}`} style={s.iconButton} onPress={() => setShown(prev => prev.map((v, index) => index === i ? !v : v))}>
            <Ionicons name={shown[i] ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      </View>)}
      <Text style={[s.text, { color: c.textMuted }]}>Minimal 8 karakter. Setelah disimpan, Anda perlu login kembali.</Text>
      <ProfileSaveButton label="Simpan kata sandi" busy={busy} onPress={() => void save()} />
    </>}
  </ProfileSheet>;
}
