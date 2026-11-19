import React, { useRef, useState } from 'react';
import { Image, Platform, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme/ThemeContext';
import { ProfileSaveButton, ProfileSheet, profileStyles as s } from './ProfileSheet';
import type { ApiError } from '@/types/api';

export type ProfileSetting = 'contact' | 'photo' | 'employment';
export function ProfileSettingsModal({ mode, onClose, onSaved }: {
  mode: ProfileSetting; onClose: () => void; onSaved: (message: string) => void;
}) {
  const { user, employee, refreshUser } = useAuth();
  const { colors: c } = useTheme();
  const person = employee || user?.employee;
  const [email, setEmail] = useState(person?.email || user?.email || '');
  const [phone, setPhone] = useState(person?.phone || '');
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const changingEmail = !!email.trim() && email.trim().toLowerCase() !== (user?.email || '').trim().toLowerCase();
  const title = mode === 'contact' ? 'Edit informasi kontak' : mode === 'photo' ? 'Ubah foto profil' : 'Data kepegawaian';
  const inputStyle = [s.input, { color: c.textDark, backgroundColor: c.cardBg, borderColor: c.borderControl, outlineColor: c.accentSolid }];
  const choosePhoto = async () => {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!/\.(jpe?g|png|webp)$/i.test(file.name) || (file.mimeType && !['image/jpeg','image/png','image/webp'].includes(file.mimeType))) { setError('Pilih foto JPG, PNG atau WebP.'); return; }
      if ((file.size || 0) > 10 * 1024 * 1024) { setError('Ukuran foto maksimal 10 MB.'); return; }
      setPhoto(file);
    } catch { setError('Foto belum dapat dibuka. Silakan pilih kembali.'); }
  };
  const save = async () => {
    if (lock.current) return;
    setError('');
    if (mode === 'contact') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().toLowerCase().endsWith('.local')) { setError('Gunakan alamat email aktif yang valid.'); return; }
      if (person && (phone.trim().length > 20 || (phone.trim() && !/^[0-9+\-\s()]+$/.test(phone.trim())))) { setError('Nomor telepon maksimal 20 karakter: angka, +, -, spasi atau tanda kurung.'); return; }
      if (changingEmail && !password) { setError('Isi kata sandi saat ini untuk mengonfirmasi perubahan email.'); return; }
    } else if (!photo || !person) { setError('Pilih foto profil terlebih dahulu.'); return; }
    lock.current = true; setBusy(true);
    try {
      let response;
      if (mode === 'contact') {
        response = await apiClient.post('/me/update-profile', {
          email: email.trim(), ...(person ? { phone: phone.trim() } : {}), ...(changingEmail ? { current_password: password } : {}),
        });
      } else {
        const body = new FormData();
        if (Platform.OS === 'web') {
          const blob = photo!.file || await fetch(photo!.uri).then(r => r.blob());
          if (!blob || blob.size > 10 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(blob.type)) throw new Error('Pilih foto JPG, PNG atau WebP maksimal 10 MB.');
          body.append('foto', blob, photo!.name);
        } else body.append('foto', { uri: photo!.uri, name: photo!.name, type: photo!.mimeType || 'image/jpeg' } as any);
        response = await apiClient.post('/me/update-photo', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setPassword('');
      await refreshUser();
      onSaved(response.data?.message || response.data?.data?.message || 'Profil berhasil diperbarui.');
    } catch (failure) {
      const e = failure as ApiError;
      setError(Object.values(e.fieldErrors || {}).flat().join('\n') || e.message || 'Profil belum dapat disimpan. Coba lagi.');
    } finally { lock.current = false; setBusy(false); }
  };
  return <ProfileSheet visible title={title} busy={busy} onClose={onClose}>
    {!!error && <Text accessibilityRole="alert" style={[s.text, { color: c.dangerFg }]}>{error}</Text>}
    {mode === 'contact' && <>
      <View style={s.group}><Text style={[s.label, { color: c.textDark }]}>Email</Text><TextInput accessibilityLabel="Email profil" value={email} onChangeText={setEmail} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254} style={inputStyle} /></View>
      {!!person && <View style={s.group}><Text style={[s.label, { color: c.textDark }]}>Nomor telepon</Text><TextInput accessibilityLabel="Nomor telepon profil" value={phone} onChangeText={setPhone} editable={!busy} keyboardType="phone-pad" maxLength={20} style={inputStyle} /></View>}
      {changingEmail && <><Text style={[s.text, { color: c.textMuted }]}>Perubahan email memerlukan kata sandi akun. Tautan verifikasi akan dikirim ke alamat baru.</Text><TextInput accessibilityLabel="Kata sandi konfirmasi email" placeholder="Kata sandi saat ini" placeholderTextColor={c.textMuted} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} style={inputStyle} /></>}
      <ProfileSaveButton label="Simpan informasi kontak" busy={busy} onPress={() => void save()} />
    </>}
    {mode === 'photo' && <>
      <Text style={[s.text, { color: c.textMuted }]}>Gunakan foto JPG, PNG atau WebP, maksimal 10 MB.</Text>
      {photo && <><Image source={{ uri: photo.uri }} style={s.preview} resizeMode="cover" accessibilityLabel="Pratinjau foto profil" /><Text style={[s.text, { color: c.textDark }]}>{photo.name}</Text></>}
      <ProfileSaveButton label={photo ? 'Pilih foto lain' : 'Pilih foto profil'} busy={busy} onPress={() => void choosePhoto()} />
      {!!photo && <ProfileSaveButton label="Simpan foto profil" busy={busy} onPress={() => void save()} />}
    </>}
    {mode === 'employment' && <>
      {!person ? <Text style={[s.text, { color: c.textMuted }]}>Akun ini belum terhubung dengan data pegawai.</Text> : <>
        {[
          ['Nama', person.name], ['NIP / Identitas pegawai', person.nip], ['Pangkat / Golongan', person.rank],
          ['Jabatan', person.position], ['Unit kerja', person.department], ['Status pegawai', person.is_active ? 'Aktif' : 'Nonaktif'],
        ].map(([label, value]) => <View key={label} style={s.group}><Text style={[s.label, { color: c.textMuted }]}>{label}</Text><Text selectable style={[s.text, { color: c.textDark }]}>{value || 'Belum diisi'}</Text></View>)}
        <Text style={[s.text, { color: c.textMuted }]}>Perubahan pangkat, jabatan dan unit kerja dikelola melalui Kepegawaian. Hubungi admin kepegawaian bila data perlu dikoreksi.</Text>
      </>}
    </>}
  </ProfileSheet>;
}
