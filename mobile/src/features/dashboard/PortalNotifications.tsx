import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { apiClient } from '@/lib/api/client';
import { useReverbRefresh } from '@/hooks/useReverbRefresh';
import { useTheme } from '@/theme/ThemeContext';
import { ProfileSheet, profileStyles as s } from '@/features/profile/ProfileSheet';
import type { ApiError } from '@/types/api';

interface PortalNotification { id: number; title: string; message?: string; body?: string; type: string; read_at?: string | null }
export function usePortalNotifications() {
  const reading = useRef(new Set<number>());
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await apiClient.get('/portal/notifications', { params: { per_page: 50 } });
      setItems(Array.isArray(response.data.data) ? response.data.data : []);
      setUnread(Number(response.data.meta?.unread_count || 0));
    } catch (failure) { setError((failure as ApiError).message || 'Notifikasi belum dapat dimuat.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // Fetching external server state on mount follows the dashboard refresh convention.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  useReverbRefresh(['user'], () => { void refresh(); });
  const markRead = async (item: PortalNotification) => {
    if (item.read_at) return true;
    if (reading.current.has(item.id)) return false;
    reading.current.add(item.id);
    try {
      const response = await apiClient.post(`/portal/notifications/${item.id}/read`);
      setItems(prev => prev.map(value => value.id === item.id ? {...value,read_at:new Date().toISOString()} : value));
      setUnread(Number(response.data.unread_count ?? 0)); return true;
    } catch (failure) {setError((failure as ApiError).message || 'Notifikasi belum dapat ditandai dibaca.');return false;}
    finally { reading.current.delete(item.id); }
  };
  return {items,unread,loading,error,refresh,markRead};
}

export function PortalNotifications({ visible, onClose, model, onSelect }: {
  visible: boolean; onClose: () => void; model: ReturnType<typeof usePortalNotifications>; onSelect: (type: string) => void;
}) {
  const { colors: c } = useTheme();
  return <ProfileSheet visible={visible} title="Notifikasi" busy={false} onClose={onClose}>
    {model.loading && <ActivityIndicator color={c.accentSolid} />}
    {!!model.error && <Text accessibilityRole="alert" style={[s.text,{color:c.dangerFg}]}>{model.error}</Text>}
    {!model.loading && !model.error && !model.items.length && <Text style={[s.text,{color:c.textMuted}]}>Belum ada notifikasi.</Text>}
    {model.items.map(item => <TouchableOpacity accessibilityRole="button" accessibilityLabel={item.title} key={item.id}
      style={{paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.glassBorder,minHeight:48}}
      onPress={() => {void model.markRead(item).then(ok => {if(ok){onClose();onSelect(item.type);}});}}>
      <Text style={[s.label,{color:c.textDark,fontWeight:item.read_at?'500':'700'}]}>{item.title}</Text>
      {!!(item.message || item.body) && <Text style={[s.text,{color:c.textMuted}]}>{item.message || item.body}</Text>}
    </TouchableOpacity>)}
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Perbarui notifikasi" onPress={() => {void model.refresh();}} style={s.button}>
      <Text style={[s.buttonText,{color:c.accentFg}]}>Perbarui notifikasi</Text>
    </TouchableOpacity>
  </ProfileSheet>;
}
