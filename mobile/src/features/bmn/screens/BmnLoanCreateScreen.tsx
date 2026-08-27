import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../lib/api/client';
import { normalizeError } from '../../../lib/api/errors';
import { useTheme } from '../../../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { AppDatePickerModal } from '../../../components/AppDatePickerModal';
import { NotificationModal } from '../../../components/ui/NotificationModal';

interface AssetOption {
  id: string;
  nama_barang: string;
  kode_barang?: string | null;
  nup?: string | number | null;
  merk_tipe?: string | null;
  merk?: string | null;
  tipe?: string | null;
  jenis_bmn?: string | null;
  pengguna?: string | null;
  nama_pengguna?: string | null;
  no_polisi?: string | null;
  status_bmn?: string | null;
  lokasi_ruang?: string | null;
}

interface EmployeeOption {
  id: string;
  name?: string;
  nama?: string;
  nip?: string | null;
  position?: string | null;
}

const today = () => new Date().toISOString().slice(0, 10);
const BMN_PRIMARY = '#059669';
const BMN_SOFT = '#ecfdf5';

function formatDateLabel(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Pilih tanggal';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function BmnLoanCreateScreen() {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation<any>();
  const colors = {
    background: themeColors.bgDark,
    card: themeColors.cardBg,
    foreground: themeColors.textDark,
    mutedForeground: themeColors.textMuted,
    border: themeColors.glassBorder,
    muted: themeColors.bgSurface,
    primary: BMN_PRIMARY,
  };
  const spacing = { md: 12, lg: 16 };
  const [step, setStep] = useState(1);
  const [assetQuery, setAssetQuery] = useState('');
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<AssetOption[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loanDate, setLoanDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [datePickerField, setDatePickerField] = useState<'loanDate' | 'dueDate' | null>(null);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'success' | 'info';
    iconName?: keyof typeof Ionicons.glyphMap;
  }>({ visible: false, title: '', message: '', variant: 'info' });

  const showNotification = (
    title: string,
    message: string,
    variant: 'danger' | 'warning' | 'success' | 'info',
    iconName: keyof typeof Ionicons.glyphMap
  ) => setNotification({ visible: true, title, message, variant, iconName });

  useEffect(() => {
    if (!assetQuery.trim()) return;

    const timer = setTimeout(async () => {
      setLoadingAssets(true);
      try {
        const response = await apiClient.get('/bmn/assets', {
          params: { page: 1, per_page: 20, ...(assetQuery.trim() ? { search: assetQuery.trim() } : {}) },
        });
        setAssets((response.data?.data || []) as AssetOption[]);
      } catch {
        setAssets([]);
      } finally {
        setLoadingAssets(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [assetQuery]);

  useEffect(() => {
    if (!employeeQuery.trim()) return;
    const timer = setTimeout(async () => {
      setLoadingEmployees(true);
      try {
        const response = await apiClient.get('/kepegawaian/employees/select', {
          params: { q: employeeQuery.trim() },
        });
        setEmployees((response.data?.data || []) as EmployeeOption[]);
      } catch {
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [employeeQuery]);

  const duration = useMemo(() => {
    if (!loanDate || !dueDate) return '-';
    const start = new Date(loanDate).getTime();
    const end = new Date(dueDate).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return '-';
    return `${Math.floor((end - start) / 86400000) + 1} hari`;
  }, [loanDate, dueDate]);

  const toggleAsset = (asset: AssetOption) => {
    if (asset.status_bmn && asset.status_bmn !== 'Aktif') {
      Alert.alert('Aset Tidak Tersedia', `Status aset: ${asset.status_bmn}`);
      return;
    }
    setSelectedAssets((current) =>
      current.some((item) => item.id === asset.id)
        ? current.filter((item) => item.id !== asset.id)
        : [...current, asset]
    );
  };

  const validateStep = () => {
    if (step === 1 && selectedAssets.length === 0) {
      showNotification('Aset Belum Dipilih', 'Pilih minimal satu aset BMN sebelum melanjutkan ke detail peminjaman.', 'warning', 'cube-outline');
      return false;
    }
    if (step === 2) {
      if (!selectedEmployee) {
        showNotification('Peminjam Belum Dipilih', 'Pilih pegawai peminjam terlebih dahulu agar permohonan dapat diproses.', 'warning', 'person-add-outline');
        return false;
      }
      if (!loanDate || !dueDate || new Date(dueDate) < new Date(loanDate)) {
        showNotification('Tanggal Belum Lengkap', 'Pilih tanggal mulai dan tanggal selesai yang valid. Tanggal selesai harus setelah tanggal mulai.', 'warning', 'calendar-outline');
        return false;
      }
      if (purpose.trim().length < 10) {
        showNotification('Tujuan Belum Lengkap', 'Jelaskan tujuan peminjaman minimal 10 karakter sebelum melanjutkan.', 'warning', 'document-text-outline');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setStep((current) => Math.min(3, current + 1));
  };

  const handleSubmit = async () => {
    if (!validateStep() || !selectedEmployee) return;
    setSubmitting(true);
    try {
      await apiClient.post('/bmn/loans', {
        asset_ids: selectedAssets.map((asset) => asset.id),
        borrower_employee_id: selectedEmployee.id,
        loan_date: loanDate,
        due_date: dueDate,
        purpose: purpose.trim(),
      });
      setStep(1);
      showNotification('Permohonan Terkirim', 'Permohonan peminjaman berhasil dikirim dan siap diproses oleh pengelola BMN.', 'success', 'checkmark-circle-outline');
      setSelectedAssets([]);
      setSelectedEmployee(null);
      setEmployeeQuery('');
      setPurpose('');
      setDueDate('');
    } catch (error) {
      const apiError = normalizeError(error);
      showNotification('Gagal Mengirim Permohonan', apiError.message || 'Permohonan peminjaman gagal dikirim. Silakan coba lagi.', 'danger', 'alert-circle-outline');
    } finally {
      setSubmitting(false);
    }
  };

  const employeeName = (employee: EmployeeOption) => employee.name || employee.nama || '-';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate('BmnLoans')}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Kembali ke daftar peminjaman"
          >
            <Ionicons name="arrow-back" size={21} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Peminjaman BMN</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Form permohonan peminjaman aset</Text>
          </View>
          <Ionicons name="swap-horizontal-outline" size={28} color={BMN_PRIMARY} />
        </View>

        <View style={styles.stepper}>
          {['Daftar Barang', 'Detail', 'Konfirmasi'].map((label, index) => {
            const number = index + 1;
            const active = step >= number;
            return (
              <React.Fragment key={label}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepCircle, { backgroundColor: active ? BMN_PRIMARY : colors.muted, borderColor: active ? BMN_PRIMARY : colors.border }]}>
                    <Text style={{ color: active ? '#fff' : colors.mutedForeground, fontWeight: '800' }}>{number}</Text>
                  </View>
                  <Text style={[styles.stepLabel, { color: active ? BMN_PRIMARY : colors.mutedForeground }]}>{label}</Text>
                </View>
                {number < 3 && <View style={[styles.stepLine, { backgroundColor: step > number ? BMN_PRIMARY : colors.border }]} />}
              </React.Fragment>
            );
          })}
        </View>

        {step === 1 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pilih Aset BMN</Text>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>Cari dan tambahkan satu atau beberapa aset.</Text>
            <TextInput
              value={assetQuery}
              onChangeText={(text) => {
                setAssetQuery(text);
                if (!text.trim()) setAssets([]);
              }}
              placeholder="Cari nama, kode, atau NUP..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            {!assetQuery.trim() && (
              <View style={styles.searchHint}>
                <Ionicons name="search-outline" size={20} color={BMN_PRIMARY} />
                <Text style={[styles.searchHintText, { color: colors.mutedForeground }]}>Ketik nama, kode, atau NUP untuk mencari aset.</Text>
              </View>
            )}
            {loadingAssets && <ActivityIndicator color={BMN_PRIMARY} style={{ marginVertical: spacing.md }} />}
            {assetQuery.trim() && !loadingAssets && assets.map((asset) => {
              const selected = selectedAssets.some((item) => item.id === asset.id);
              const merkTipe = asset.merk_tipe || [asset.merk, asset.tipe].filter(Boolean).join(' / ');
              const isVehicle = `${asset.jenis_bmn || ''} ${asset.nama_barang || ''}`.toLowerCase().includes('angkutan') || `${asset.jenis_bmn || ''} ${asset.nama_barang || ''}`.toLowerCase().includes('kendaraan');
              const pengguna = asset.nama_pengguna || asset.pengguna;
              const hasPlate = isVehicle && asset.no_polisi && asset.no_polisi !== '-';
              return (
                <TouchableOpacity key={asset.id} onPress={() => toggleAsset(asset)} style={[styles.assetRow, { borderColor: selected ? BMN_PRIMARY : colors.border, backgroundColor: selected ? BMN_SOFT : colors.background }]}> 
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.assetName, { color: colors.foreground }]}>{asset.nama_barang}</Text>
                    {!!merkTipe && <Text style={[styles.assetDetail, { color: colors.mutedForeground }]}>{merkTipe}</Text>}
                    <Text style={[styles.assetMeta, { color: colors.mutedForeground }]}>{asset.kode_barang || '-'} • NUP {asset.nup || '-'}</Text>
                    {!!pengguna && <View style={styles.assetInfoRow}><Ionicons name="person-outline" size={14} color={colors.mutedForeground} /><Text style={[styles.assetDetail, { color: colors.mutedForeground }]}>{pengguna}</Text></View>}
                    {!!asset.lokasi_ruang && <View style={styles.assetInfoRow}><Ionicons name="location-outline" size={14} color={colors.mutedForeground} /><Text style={[styles.assetDetail, { color: colors.mutedForeground }]}>{asset.lokasi_ruang}</Text></View>}
                    {!!hasPlate && <View style={styles.assetInfoRow}><Ionicons name="car-outline" size={14} color={BMN_PRIMARY} /><Text style={[styles.assetDetail, { color: BMN_PRIMARY, fontWeight: '800' }]}>{asset.no_polisi}</Text></View>}
                  </View>
                  <Ionicons name={selected ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={selected ? BMN_PRIMARY : colors.mutedForeground} />
                </TouchableOpacity>
              );
            })}
            <Text style={[styles.selectedCount, { color: BMN_PRIMARY }]}>{selectedAssets.length} aset dipilih</Text>
            {selectedAssets.length > 0 && (
              <View style={[styles.selectedAssetsBox, { backgroundColor: BMN_SOFT, borderColor: `${BMN_PRIMARY}55` }]}>
                <Text style={[styles.selectedAssetsTitle, { color: colors.foreground }]}>Aset terpilih</Text>
                {selectedAssets.map((asset) => {
                  const merkTipe = asset.merk_tipe || [asset.merk, asset.tipe].filter(Boolean).join(' / ');
                  const assetText = `${asset.jenis_bmn || ''} ${asset.nama_barang || ''}`.toLowerCase();
                  const isVehicle = assetText.includes('angkutan') || assetText.includes('kendaraan');
                  const hasPlate = isVehicle && asset.no_polisi && asset.no_polisi !== '-';
                  return (
                    <View key={asset.id} style={[styles.selectedAssetRow, { borderBottomColor: `${BMN_PRIMARY}30` }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.assetName, { color: colors.foreground }]} numberOfLines={1}>{asset.nama_barang}</Text>
                        {!!merkTipe && <Text style={[styles.assetDetail, { color: colors.mutedForeground }]}>{merkTipe}</Text>}
                        <Text style={[styles.assetMeta, { color: colors.mutedForeground }]}>{asset.kode_barang || '-'} • NUP {asset.nup || '-'}</Text>
                        {!!hasPlate && <View style={styles.assetInfoRow}><Ionicons name="car-outline" size={13} color={BMN_PRIMARY} /><Text style={[styles.assetDetail, { color: BMN_PRIMARY, fontWeight: '800' }]}>{asset.no_polisi}</Text></View>}
                      </View>
                      <TouchableOpacity
                      onPress={() => setSelectedAssets((current) => current.filter((item) => item.id !== asset.id))}
                      style={styles.removeAssetButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Batalkan pilihan ${asset.nama_barang}`}
                    >
                        <Ionicons name="close-circle" size={22} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: spacing.md }}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Data Peminjam</Text>
              {selectedEmployee ? (
                <TouchableOpacity onPress={() => setSelectedEmployee(null)} style={[styles.selectedEmployee, { backgroundColor: BMN_SOFT, borderColor: BMN_PRIMARY }]}>
                  <View style={{ flex: 1 }}><Text style={[styles.assetName, { color: colors.foreground }]}>{employeeName(selectedEmployee)}</Text><Text style={[styles.assetMeta, { color: colors.mutedForeground }]}>NIP {selectedEmployee.nip || '-'}</Text></View>
                  <Text style={{ color: BMN_PRIMARY, fontWeight: '700' }}>Ubah</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TextInput value={employeeQuery} onChangeText={(text) => { setEmployeeQuery(text); if (!text.trim()) setEmployees([]); }} placeholder="Cari nama atau NIP pegawai..." placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
                  {loadingEmployees && <ActivityIndicator color={BMN_PRIMARY} />}
                  {employees.map((employee) => <TouchableOpacity key={employee.id} onPress={() => { setSelectedEmployee(employee); setEmployeeQuery(''); setEmployees([]); }} style={[styles.assetRow, { borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.assetName, { color: colors.foreground }]}>{employeeName(employee)}</Text><Text style={[styles.assetMeta, { color: colors.mutedForeground }]}>NIP {employee.nip || '-'}</Text></View><Ionicons name="person-add-outline" size={20} color={BMN_PRIMARY} /></TouchableOpacity>)}
                </>
              )}
            </View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Durasi dan Tujuan</Text>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tanggal Mulai</Text>
              <TouchableOpacity onPress={() => setDatePickerField('loanDate')} style={[styles.dateField, { backgroundColor: colors.background, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel="Pilih tanggal mulai">
                <Text style={[styles.dateFieldText, { color: loanDate ? colors.foreground : colors.mutedForeground }]}>{formatDateLabel(loanDate)}</Text>
                <Ionicons name="calendar-outline" size={19} color={BMN_PRIMARY} />
              </TouchableOpacity>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tanggal Selesai</Text>
              <TouchableOpacity onPress={() => setDatePickerField('dueDate')} style={[styles.dateField, { backgroundColor: colors.background, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel="Pilih tanggal selesai">
                <Text style={[styles.dateFieldText, { color: dueDate ? colors.foreground : colors.mutedForeground }]}>{formatDateLabel(dueDate)}</Text>
                <Ionicons name="calendar-outline" size={19} color={BMN_PRIMARY} />
              </TouchableOpacity>
              <Text style={[styles.duration, { color: BMN_PRIMARY }]}>Durasi: {duration}</Text>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Keperluan Peminjaman</Text>
              <TextInput value={purpose} onChangeText={setPurpose} multiline numberOfLines={4} placeholder="Jelaskan tujuan peminjaman minimal 10 karakter..." placeholderTextColor={colors.mutedForeground} style={[styles.input, styles.textarea, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Konfirmasi Permohonan</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Aset</Text>
            {selectedAssets.map((asset) => {
              const merkTipe = asset.merk_tipe || [asset.merk, asset.tipe].filter(Boolean).join(' / ');
              const assetText = `${asset.jenis_bmn || ''} ${asset.nama_barang || ''}`.toLowerCase();
              const isVehicle = assetText.includes('angkutan') || assetText.includes('kendaraan');
              const hasPlate = isVehicle && asset.no_polisi && asset.no_polisi !== '-';
              return (
                <View key={asset.id} style={[styles.confirmAssetCard, { backgroundColor: BMN_SOFT, borderColor: `${BMN_PRIMARY}35` }]}>
                  <Text style={[styles.confirmAssetName, { color: colors.foreground }]}>{asset.nama_barang}</Text>
                  {!!merkTipe && <Text style={[styles.assetDetail, { color: colors.mutedForeground }]}>{merkTipe}</Text>}
                  <Text style={[styles.assetMeta, { color: colors.mutedForeground }]}>{asset.kode_barang || '-'} • NUP {asset.nup || '-'}</Text>
                  {!!hasPlate && <View style={styles.assetInfoRow}><Ionicons name="car-outline" size={13} color={BMN_PRIMARY} /><Text style={[styles.assetDetail, { color: BMN_PRIMARY, fontWeight: '800' }]}>{asset.no_polisi}</Text></View>}
                </View>
              );
            })}
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Peminjam</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{selectedEmployee ? employeeName(selectedEmployee) : '-'}</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Periode</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{loanDate} sampai {dueDate} ({duration})</Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Keperluan</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{purpose}</Text>
          </View>
        )}

        <View style={styles.actions}>
          {step > 1 && <TouchableOpacity onPress={() => setStep((current) => current - 1)} style={[styles.secondaryButton, { borderColor: colors.border }]}><Text style={{ color: colors.foreground, fontWeight: '700' }}>Kembali</Text></TouchableOpacity>}
          {step < 3 ? <TouchableOpacity onPress={handleNext} style={[styles.primaryButton, { backgroundColor: BMN_PRIMARY }]}><Text style={styles.primaryButtonText}>Lanjut</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></TouchableOpacity> : <TouchableOpacity onPress={handleSubmit} disabled={submitting} style={[styles.primaryButton, { backgroundColor: BMN_PRIMARY }]}>{submitting ? <ActivityIndicator color="#fff" /> : <><Ionicons name="send-outline" size={18} color="#fff" /><Text style={styles.primaryButtonText}>Kirim Permohonan</Text></>}</TouchableOpacity>}
        </View>
      </ScrollView>
      <NotificationModal
        visible={notification.visible}
        title={notification.title}
        message={notification.message}
        variant={notification.variant}
        iconName={notification.iconName}
        buttonText="Mengerti"
        onClose={() => setNotification((current) => ({ ...current, visible: false }))}
      />
      <AppDatePickerModal
        visible={datePickerField !== null}
        value={datePickerField === 'loanDate' ? loanDate : dueDate}
        title={datePickerField === 'loanDate' ? 'Pilih Tanggal Mulai' : 'Pilih Tanggal Selesai'}
        onConfirm={(date) => {
          if (datePickerField === 'loanDate') setLoanDate(date);
          if (datePickerField === 'dueDate') setDueDate(date);
        }}
        onClose={() => setDatePickerField(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: BMN_SOFT },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 3 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  stepItem: { alignItems: 'center', width: 76 },
  stepCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 9, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4, marginBottom: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  helper: { fontSize: 12, marginBottom: 12 },
  input: { minHeight: 46, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  dateField: { minHeight: 46, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  dateFieldText: { fontSize: 14 },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  assetRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  assetName: { fontSize: 14, fontWeight: '700' },
  assetMeta: { fontSize: 11, marginTop: 3 },
  assetDetail: { fontSize: 11, marginTop: 3 },
  assetInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  searchHint: { minHeight: 84, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 6 },
  searchHintText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  selectedCount: { fontSize: 12, fontWeight: '800', textAlign: 'right', marginTop: 4 },
  selectedAssetsBox: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 10 },
  selectedAssetsTitle: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  selectedAssetRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 7 },
  removeAssetButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  selectedEmployee: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 5 },
  duration: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { fontSize: 11, fontWeight: '700', marginTop: 14, marginBottom: 4 },
  summaryValue: { fontSize: 14, lineHeight: 21 },
  confirmAssetCard: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  confirmAssetName: { fontSize: 14, fontWeight: '800' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 2 },
  secondaryButton: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { minHeight: 46, borderRadius: 12, paddingHorizontal: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '800' },
});
