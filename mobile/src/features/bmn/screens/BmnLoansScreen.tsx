import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../lib/api/client';
import { normalizeError } from '../../../lib/api/errors';
import { useTheme } from '../../../theme/ThemeContext';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

interface LoanRecord {
  id: string;
  loan_date?: string | null;
  due_date?: string | null;
  return_date?: string | null;
  status?: string | null;
  purpose?: string | null;
  late_days?: number | null;
  asset?: {
    nama_barang?: string | null;
    kode_barang?: string | null;
    nup?: string | number | null;
    merk_tipe?: string | null;
    no_polisi?: string | null;
    lokasi_ruang?: string | null;
  };
  borrower?: { name?: string | null; nip?: string | null };
}

const BMN_PRIMARY = '#059669';
const STATUS_LABEL: Record<string, string> = {
  dipinjam: 'Dipinjam',
  terlambat: 'Terlambat',
  dikembalikan: 'Dikembalikan',
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
};

export default function BmnLoansScreen({ navigation }: any) {
  const { colors } = useTheme();
  const fallbackNavigation = useNavigation<any>();
  const navigator = navigation || fallbackNavigation;
  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingLoan, setDeletingLoan] = useState<LoanRecord | null>(null);

  const fetchLoans = useCallback(async (pullRefresh = false) => {
    if (pullRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/bmn/loans', { params: { page: 1, per_page: 50 } });
      setRecords((response.data?.data || []) as LoanRecord[]);
    } catch (err) {
      setError(normalizeError(err).message || 'Gagal memuat daftar peminjaman.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchLoans();
  }, [fetchLoans]));

  const openCreate = () => navigator.navigate('BmnLoanCreate');

  const handleDelete = (loan: LoanRecord) => setDeletingLoan(loan);

  const confirmDelete = async () => {
    if (!deletingLoan) return;
    const loan = deletingLoan;
    setDeletingLoan(null);
    try {
      await apiClient.delete(`/bmn/loans/${loan.id}`);
      await fetchLoans(true);
    } catch (err) {
      Alert.alert('Gagal Menghapus', normalizeError(err).message || 'Riwayat peminjaman gagal dihapus.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bgDark }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchLoans(true)} tintColor={BMN_PRIMARY} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textDark }]}>Peminjaman BMN</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Kelola riwayat pinjaman dan ajukan peminjaman aset.</Text>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={openCreate} accessibilityLabel="Pinjam aset">
            <Ionicons name="add" size={19} color="#ffffff" />
            <Text style={styles.createButtonText}>Pinjam Aset</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          <View style={styles.summaryIcon}><Ionicons name="swap-horizontal-outline" size={23} color={BMN_PRIMARY} /></View>
          <View><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Peminjaman</Text><Text style={[styles.summaryValue, { color: colors.textDark }]}>{records.length}</Text></View>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={BMN_PRIMARY} /><Text style={[styles.helper, { color: colors.textMuted }]}>Memuat daftar peminjaman...</Text></View>
        ) : error ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: '#fecaca' }]}><Ionicons name="alert-circle-outline" size={34} color="#dc2626" /><Text style={[styles.emptyTitle, { color: colors.textDark }]}>Gagal Memuat Data</Text><Text style={[styles.helper, { color: colors.textMuted }]}>{error}</Text><TouchableOpacity onPress={() => fetchLoans()} style={styles.retryButton}><Text style={styles.createButtonText}>Coba Lagi</Text></TouchableOpacity></View>
        ) : records.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}><Ionicons name="file-tray-outline" size={42} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.textDark }]}>Belum Ada Peminjaman</Text><Text style={[styles.helper, { color: colors.textMuted }]}>Ajukan peminjaman aset BMN melalui tombol di atas.</Text><TouchableOpacity onPress={openCreate} style={styles.retryButton}><Text style={styles.createButtonText}>Pinjam Aset</Text></TouchableOpacity></View>
        ) : (
          records.map((loan) => {
            const status = loan.status || 'dipinjam';
            const statusColor = status === 'terlambat' ? '#dc2626' : status === 'dikembalikan' ? BMN_PRIMARY : '#2563eb';
            const asset = loan.asset;
            return (
              <View key={loan.id} style={[styles.loanCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                <View style={styles.loanHeader}><View style={{ flex: 1 }}><Text style={[styles.assetName, { color: colors.textDark }]}>{asset?.nama_barang || 'Aset BMN'}</Text><Text style={[styles.assetMeta, { color: colors.textMuted }]}>{asset?.kode_barang || '-'} • NUP {asset?.nup || '-'}</Text></View><View style={styles.loanHeaderActions}><View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}><Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABEL[status] || status}</Text></View><TouchableOpacity onPress={() => handleDelete(loan)} style={styles.deleteButton} accessibilityRole="button" accessibilityLabel={`Hapus riwayat ${asset?.nama_barang || 'peminjaman'}`}><Ionicons name="trash-outline" size={17} color="#dc2626" /></TouchableOpacity></View></View>
                {!!asset?.merk_tipe && <Text style={[styles.detailText, { color: colors.textMuted }]}>{asset.merk_tipe}</Text>}
                {!!asset?.no_polisi && asset.no_polisi !== '-' && <View style={styles.infoRow}><Ionicons name="car-outline" size={14} color={BMN_PRIMARY} /><Text style={[styles.detailText, { color: BMN_PRIMARY }]}>{asset.no_polisi}</Text></View>}
                {!!asset?.lokasi_ruang && <View style={styles.infoRow}><Ionicons name="location-outline" size={14} color={colors.textMuted} /><Text style={[styles.detailText, { color: colors.textMuted }]}>{asset.lokasi_ruang}</Text></View>}
                <View style={[styles.divider, { backgroundColor: colors.glassBorder }]} />
                <View style={styles.infoRow}><Ionicons name="person-outline" size={14} color={colors.textMuted} /><Text style={[styles.detailText, { color: colors.textMuted }]}>{loan.borrower?.name || 'Peminjam belum tersedia'}</Text></View>
                <View style={styles.dateRow}><Text style={[styles.detailText, { color: colors.textMuted }]}>Pinjam {formatDate(loan.loan_date)}</Text><Text style={[styles.detailText, { color: colors.textMuted }]}>Jatuh tempo {formatDate(loan.due_date)}</Text></View>
                {!!loan.purpose && <Text style={[styles.purpose, { color: colors.textDark }]} numberOfLines={2}>{loan.purpose}</Text>}
              </View>
            );
          })
        )}
      </ScrollView>
      <ConfirmModal
        visible={!!deletingLoan}
        title="Hapus Riwayat Peminjaman?"
        message={`Riwayat peminjaman ${deletingLoan?.asset?.nama_barang || 'aset ini'} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        iconName="trash-outline"
        variant="danger"
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingLoan(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  createButton: { minHeight: 44, borderRadius: 12, backgroundColor: BMN_PRIMARY, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  createButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  summaryCard: { minHeight: 76, borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  summaryIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '700' },
  summaryValue: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  loanCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  loanHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  loanHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2' },
  assetName: { fontSize: 15, fontWeight: '800' },
  assetMeta: { fontSize: 11, marginTop: 3 },
  detailText: { fontSize: 11, lineHeight: 17 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  statusPill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { fontSize: 10, fontWeight: '800' },
  divider: { height: 1, marginTop: 10, marginBottom: 3 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 5 },
  purpose: { fontSize: 12, lineHeight: 18, marginTop: 9 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  helper: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10 },
  retryButton: { minHeight: 44, borderRadius: 12, backgroundColor: BMN_PRIMARY, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
});
