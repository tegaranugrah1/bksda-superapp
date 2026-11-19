import React, { useRef, useState } from 'react';
import { Text, TextInput } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { apiClient } from '@/lib/api/client';
import type { ApiError } from '@/types/api';
import { ProfileSheet, ProfileSaveButton, profileStyles as s } from '@/features/profile/ProfileSheet';

export function TwoFactorSetup({ onDone, onLogout }: { onDone: () => Promise<void>; onLogout: () => Promise<void> }) {
  const { colors: c } = useTheme();
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const submit = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (recovery.length) { setSecret(''); setCode(''); await onDone(); return; }
      if (!secret) {
        const response = await apiClient.post('/me/2fa/enable');
        const data = response.data.data;
        if (!data?.secret) throw new Error('Kunci authenticator belum tersedia. Coba lagi.');
        setSecret(data.secret);
      } else {
        if (!/^\d{6}$/.test(code.trim())) throw new Error('Masukkan kode 6 digit dari authenticator.');
        const response = await apiClient.post('/me/2fa/confirm', { code: code.trim() });
        setRecovery(response.data.data.recovery_codes || []); setCode('');
      }
    } catch (failure) {
      const e = failure as ApiError;
      setError(Object.values(e.fieldErrors || {}).flat().join('\n') || e.message || 'Pengaturan 2FA belum selesai.');
    } finally { lock.current = false; setBusy(false); }
  };
  return <ProfileSheet visible title="Aktifkan autentikasi dua langkah" busy={busy} closable={false} onClose={() => {}}>
    {!!error && <Text accessibilityRole="alert" style={[s.text,{color:c.dangerFg}]}>{error}</Text>}
    {recovery.length ? <>
      <Text style={[s.text,{color:c.textDark}]}>2FA aktif. Simpan kode pemulihan berikut di tempat aman sebelum melanjutkan. Setiap kode hanya dapat digunakan sekali.</Text>
      <Text selectable accessibilityLabel="Kode pemulihan 2FA" style={[s.text,{color:c.textDark}]}>{recovery.join('\n')}</Text>
    </> : <>
      <Text style={[s.text,{color:c.textMuted}]}>Akun administrator memerlukan authenticator untuk mengakses aplikasi.</Text>
      {!!secret && <>
        <Text style={[s.text,{color:c.textDark}]}>Tambahkan akun secara manual pada aplikasi authenticator dengan kunci berikut. Pilih jenis kode berbasis waktu (TOTP).</Text>
        <Text selectable accessibilityLabel="Kunci pengaturan authenticator" style={[s.text,{color:c.textDark}]}>{secret}</Text>
        <TextInput accessibilityLabel="Kode konfirmasi pengaturan 2FA" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} editable={!busy} style={[s.input,{color:c.textDark,borderColor:c.borderControl}]} />
      </>}
    </>}
    <ProfileSaveButton label={recovery.length ? 'Kode pemulihan sudah disimpan' : secret ? 'Konfirmasi authenticator' : 'Mulai pengaturan 2FA'} busy={busy} onPress={() => void submit()} />
    <ProfileSaveButton label="Keluar akun" busy={busy} onPress={() => {setSecret('');setCode('');setRecovery([]);void onLogout();}} />
  </ProfileSheet>;
}
