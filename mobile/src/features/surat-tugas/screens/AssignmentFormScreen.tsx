import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { apiClient } from "@/lib/api/client";
import { useTheme } from "@/theme/ThemeContext";
import {
  buildKegiatanDiktumText, DEFAULT_FUNDING, DEFAULT_TASK_TYPES, detectDeparture,
  formatPortalDate, isJenisKegiatanTask, isSectionEmployee, isStructuralEmployee,
  isValidDate, normalizeTaskTypeName, personalAssignmentEntries, validateAssignmentFile,
  validatePortalAssignment, type PersonDates, type PortalAssignmentDraft,
  type PortalEmployee, type PortalTaskType,
} from "../assignmentPortalForm";

type ScheduleConflict = { employee_name?: string; type?: string; range_formatted?: string; message?: string; keterangan?: string };
type DateTarget = { part: "mulai" | "selesai" | "single"; personId?: string };
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const clampDate = (value: string, min: string, max: string) => min && value < min ? min : max && value > max ? max : value;

export default function AssignmentFormScreen() {
  const navigation = useNavigation<any>();
  const focused = useIsFocused();
  const { isDark, toggleTheme, colors: base } = useTheme();
  const { width } = useWindowDimensions();
  const c = useMemo(() => ({
    ...base, canvas: isDark ? "#09090b" : "#f8fafc", card: isDark ? "#18181b" : "#ffffff",
    surface: isDark ? "#27272a" : "#f1f5f9", border: isDark ? "#3f3f46" : "#e2e8f0",
    control: isDark ? "#71717a" : "#7c899a", text: isDark ? "#f8fafc" : "#0f172a",
    muted: isDark ? "#a1a1aa" : "#475569", accent: isDark ? "#38bdf8" : "#0369a1",
    accentFg: isDark ? "#7dd3fc" : "#0369a1", onAccent: isDark ? "#0f172a" : "#ffffff",
    soft: isDark ? "#082f49" : "#f0f9ff", softBorder: isDark ? "#075985" : "#bae6fd",
    header: isDark ? "#082f49" : "#0369a1", danger: isDark ? "#fda4af" : "#be123c",
    warning: isDark ? "#fcd34d" : "#92400e",
    warningBg: isDark ? "#451a03" : "#fffbeb", warningBorder: isDark ? "#92400e" : "#fde68a",
  }), [base, isDark]);
  const styles = useMemo(() => createStyles(c, width), [c, width]);
  const scroll = useRef<ScrollView>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [employees, setEmployees] = useState<PortalEmployee[]>([]);
  const [selected, setSelected] = useState<PortalEmployee[]>([]);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [taskTypes, setTaskTypes] = useState<PortalTaskType[]>(DEFAULT_TASK_TYPES);
  const [task, setTask] = useState<PortalTaskType>(DEFAULT_TASK_TYPES[0]);
  const [fundingOptions, setFundingOptions] = useState(DEFAULT_FUNDING);
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [activity, setActivity] = useState("");
  const [untuk, setUntuk] = useState("Pengawasan Pekerjaan Konstruksi");
  const [place, setPlace] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [funding, setFunding] = useState("");
  const [otherFunding, setOtherFunding] = useState("");
  const [notes, setNotes] = useState("");
  const [plh, setPlh] = useState("");
  const [plhOpen, setPlhOpen] = useState(false);
  const [agreement, setAgreement] = useState<"" | "sudah" | "belum">("");
  const [bedaHari, setBedaHari] = useState(false);
  const [personDates, setPersonDates] = useState<PersonDates>({});
  const [hasWorkers, setHasWorkers] = useState(false);
  const [workerCount, setWorkerCount] = useState(1);
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState({ kind: "task" as "task" | "funding", visible: false });
  const closePicker = () => setPicker(current => ({ ...current, visible: false }));
  const [dateTarget, setDateTarget] = useState<DateTarget | null>(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [conflictResult, setConflictResult] = useState({ key: "", items: [] as ScheduleConflict[], checking: false, error: "" });

  const loadSetup = useCallback(async () => {
    setLoading(true); setSetupError("");
    const results = await Promise.allSettled([
      apiClient.get("/kepegawaian/employees/select", { params: { limit: 500 } }),
      apiClient.get("/kepegawaian/st-task-types/public"),
      apiClient.get("/kepegawaian/st-expense-templates/public", { params: { active_only: true } }),
    ]);
    const list = (r: PromiseSettledResult<any>) => {
      if (r.status !== "fulfilled") return [];
      const value = r.value.data?.data || r.value.data;
      return Array.isArray(value) ? value : [];
    };
    setEmployees(list(results[0]).map((e: any) => ({ ...e, name: e.name || e.nama_lengkap || e.nip || "Pegawai", nip: e.nip || "", department: e.department || e.satuan_kerja || "", position: e.position || e.jabatan || "" })));
    if (results[0].status === "rejected") setSetupError("Daftar pegawai belum dapat dimuat. Periksa koneksi lalu coba lagi.");
    const types = list(results[1]).filter((t: any) => t.kode && t.nama && t.mode_lokasi);
    if (types.length) { setTaskTypes(types); setTask(current => types.find((t: PortalTaskType) => t.kode === current.kode) || types.find((t: PortalTaskType) => t.kode === "luar_wilayah") || types[0]); }
    const funds = list(results[2]).filter((v: any) => v.name).map((v: any) => ({ id: v.name, label: v.name }));
    if (funds.length) setFundingOptions([...funds.filter((v: { id: string }) => v.id !== "other"), { id: "other", label: "Lainnya" }]);
    if (results[1].status === "rejected" || results[2].status === "rejected") setSetupError(previous => previous || "Pengaturan belum dapat dimuat. Pilihan bawaan tersedia; coba lagi untuk mengambil pengaturan terbaru.");
    setLoading(false);
  }, []);
  // Tabs retain this screen; fetch current settings again on every visit.
  useFocusEffect(useCallback(() => { void loadSetup(); }, [loadSetup]));
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);

  const oneDay = task.aturan_durasi === "wajib_1_hari";
  const structural = selected.some(isStructuralEmployee);
  const section = selected.some(isSectionEmployee);
  const specialTask = isJenisKegiatanTask(task.nama, task.contoh_format);
  const draft: PortalAssignmentDraft = {
    employees: selected, taskType: task, kotaAsal, kotaTujuan, tempatSpesifik: place,
    namaKegiatanText: activity, untukKegiatanText: untuk, tanggalMulai: start, tanggalSelesai: oneDay ? start : end,
    sumberDana: funding, sumberDanaOther: otherFunding, keterangan: notes, namaPlh: plh,
    tandaSetuju: agreement, bedaHari: selected.length > 1 && bedaHari, employeeDates: personDates,
    jumlahBuruh: hasWorkers ? workerCount : 0,
  };
  const preview = buildKegiatanDiktumText({ ...draft, jenisTugas: task.nama, modeLokasi: task.mode_lokasi, contohFormat: task.contoh_format });
  const conflictKey = JSON.stringify({
    tanggal_mulai: start, tanggal_selesai: oneDay ? start : end || start,
    employees: selected.map(emp => ({ id: Number(emp.id), tanggal_mulai: draft.bedaHari ? personDates[String(emp.id)]?.mulai : start, tanggal_selesai: draft.bedaHari ? personDates[String(emp.id)]?.selesai : oneDay ? start : end || start })),
  });
  const conflicts = conflictResult.key === conflictKey ? conflictResult.items : [];
  const checking = conflictResult.key === conflictKey && conflictResult.checking;
  const conflictError = conflictResult.key === conflictKey ? conflictResult.error : "";
  useEffect(() => {
    const payload = JSON.parse(conflictKey);
    if (step !== 2 || !isValidDate(payload.tanggal_mulai) || !payload.employees.length || payload.employees.some((e: any) => !isValidDate(e.tanggal_mulai || "") || !isValidDate(e.tanggal_selesai || ""))) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setConflictResult({ key: conflictKey, items: [], checking: true, error: "" });
      apiClient.post("/surat-tugas/check-conflicts", payload, { signal: controller.signal }).then(res => {
        const result = res.data?.data || res.data;
        if (!controller.signal.aborted) setConflictResult({ key: conflictKey, items: result?.conflicts || [], checking: false, error: "" });
      }).catch(() => { if (!controller.signal.aborted) setConflictResult({ key: conflictKey, items: [], checking: false, error: "Pemeriksaan jadwal belum tersedia. Server tetap memvalidasi saat pengajuan dikirim." }); });
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [conflictKey, step]);

  const chooseEmployee = (emp: PortalEmployee) => {
    const next = selected.some(e => String(e.id) === String(emp.id)) ? selected.filter(e => String(e.id) !== String(emp.id)) : [...selected, emp];
    setSelected(next); setKotaAsal(detectDeparture(next)); setSearch(""); setSearchOpen(false); setError("");
    if (next.length < 2) setBedaHari(false);
  };
  const searchMatches = (value: string) => employees.filter(e => `${e.name} ${e.nip}`.toLowerCase().includes(value.toLowerCase().trim())).slice(0, 50);
  const validPeriod = isValidDate(start) && isValidDate(end) && end >= start;
  const dateBounds = (target: DateTarget | null) => ({
    min: target?.personId
      ? (target.part === "selesai" ? personDates[target.personId]?.mulai || start : start)
      : target?.part === "selesai" ? start : "",
    max: target?.personId ? (oneDay ? start : end) : "",
  });
  const bounds = dateBounds(dateTarget);
  const dateAllowed = (value: string) => isValidDate(value) && (!bounds.min || value >= bounds.min) && (!bounds.max || value <= bounds.max);
  const openDate = (part: DateTarget["part"], personId?: string) => {
    const target = { part, personId };
    const { min, max } = dateBounds(target);
    const value = personId ? personDates[personId]?.[part === "selesai" ? "selesai" : "mulai"] : part === "selesai" ? end : start;
    const date = new Date(`${clampDate(value || dateValue(new Date()), min, max)}T12:00:00`);
    setCalYear(date.getFullYear()); setCalMonth(date.getMonth()); setDateTarget(target);
  };
  const applyDate = (date: Date) => {
    const value = dateValue(date);
    if (!dateTarget || !dateAllowed(value)) return;
    if (dateTarget.personId) {
      const id = dateTarget.personId;
      setPersonDates(prev => {
        const mulai = dateTarget.part === "selesai" ? prev[id]?.mulai || start : value;
        const selesai = oneDay ? mulai : dateTarget.part === "selesai" ? value : clampDate(prev[id]?.selesai || end, mulai, end);
        return { ...prev, [id]: { mulai, selesai } };
      });
    } else {
      const nextStart = dateTarget.part === "selesai" ? start || value : value;
      const nextEnd = dateTarget.part === "selesai" ? value : oneDay || !end || end < nextStart ? nextStart : end;
      setStart(nextStart); setEnd(nextEnd);
      // Keep existing personal schedules inside the updated main period.
      setPersonDates(prev => Object.fromEntries(Object.entries(prev).map(([id, range]) => {
        const mulai = clampDate(range.mulai || nextStart, nextStart, nextEnd);
        return [id, { mulai, selesai: clampDate(range.selesai || nextEnd, mulai, nextEnd) }];
      })));
    }
    setDateTarget(null); setError("");
  };
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png", "image/webp"], copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const issue = validateAssignmentFile(result.assets[0]);
        if (issue) { setError(issue); scroll.current?.scrollTo({ y: 0, animated: true }); } else { setFile(result.assets[0]); setError(""); }
      }
    } catch { setError("Berkas belum dapat dibuka. Silakan pilih kembali."); scroll.current?.scrollTo({ y: 0, animated: true }); }
  };
  const submit = async () => {
    if (submitLock.current) return;
    const issue = validatePortalAssignment(draft);
    if (issue || conflicts.length) { setError(issue || "Ada bentrok jadwal. Sesuaikan tanggal sebelum mengirim."); scroll.current?.scrollTo({ y: 0, animated: true }); return; }
    submitLock.current = true; setSubmitting(true); setError("");
    try {
      const body = new FormData();
      personalAssignmentEntries(draft).forEach(([key, value]) => body.append(key, value));
      if (file) {
        const fileIssue = validateAssignmentFile(file); if (fileIssue) throw new Error(fileIssue);
        if (Platform.OS === "web") {
          const blob = file.file || await fetch(file.uri).then(res => res.blob());
          if (!blob) throw new Error("Berkas tidak dapat dibaca. Silakan pilih kembali.");
          const blobIssue = validateAssignmentFile({ name: file.name, mimeType: blob.type || file.mimeType, size: blob.size });
          if (blobIssue) throw new Error(blobIssue);
          body.append("file_surat", blob, file.name);
        } else body.append("file_surat", { uri: file.uri, name: file.name, type: file.mimeType || "application/pdf" } as any);
      }
      await apiClient.post("/surat-tugas/submit", body, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
      setStep(3);
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data?.conflicts?.map((v: any) => v.message).filter(Boolean).join("\n") || Object.values(err?.fieldErrors || data?.errors || {}).flat().join("\n") || data?.message || err?.message || "Pengajuan belum terkirim. Silakan coba lagi.");
      scroll.current?.scrollTo({ y: 0, animated: true });
    } finally { submitLock.current = false; setSubmitting(false); }
  };

  const field = (label: string, value: string, onChange: (value: string) => void, placeholder = "", multiline = false) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} style={[styles.input, multiline && styles.textarea]} value={value}
        onChangeText={value => { onChange(value); setError(""); }} placeholder={placeholder} placeholderTextColor={c.muted} selectionColor={c.accent}
        multiline={multiline} editable={!submitting} maxLength={multiline ? 5000 : 255} />
    </View>
  );
  const dateField = (label: string, part: DateTarget["part"], personId?: string) => {
    const value = personId ? personDates[personId]?.[part === "selesai" ? "selesai" : "mulai"] : part === "selesai" ? end : start;
    const person = personId ? selected.find(emp => String(emp.id) === personId)?.name : "";
    return <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${label}${person ? ` — ${person}` : ""}`} disabled={submitting}
        style={styles.dateButton} onPress={() => openDate(part, personId)}>
        <Ionicons name="calendar-outline" size={18} color={c.accentFg} />
        <Text style={styles.dateText}>{value ? formatPortalDate(value) : "Pilih tanggal"}</Text>
      </TouchableOpacity>
    </View>;
  };
  const activeDate = dateTarget?.personId ? personDates[dateTarget.personId]?.[dateTarget.part === "selesai" ? "selesai" : "mulai"] : dateTarget?.part === "selesai" ? end : start;
  const returnToPortal = () => {
    if (step === 3) {
      setStep(1); setSelected([]); setSearch(""); setSearchOpen(false); setKotaAsal("Samarinda");
      setTask(taskTypes.find(t => t.kode === "luar_wilayah") || taskTypes[0]);
      setKotaTujuan(""); setActivity(""); setUntuk("Pengawasan Pekerjaan Konstruksi"); setPlace("");
      setStart(""); setEnd(""); setFunding(""); setOtherFunding(""); setNotes(""); setPlh("");
      setAgreement(""); setBedaHari(false); setPersonDates({}); setHasWorkers(false); setWorkerCount(1); setFile(null); setError("");
    }
    // The current tab becomes aria-hidden immediately after navigation.
    if (Platform.OS === "web") (document.activeElement as HTMLElement | null)?.blur();
    navigation.navigate("Dashboard");
  };
  const back = () => { if (step === 2) setStep(1); else returnToPortal(); };

  return (
    <SafeAreaView testID="assignment-form" style={styles.root} edges={["top", "left", "right"]}>
      {focused && <StatusBar style="light" />}
      <View style={styles.appBar}>
        <View style={styles.brand}>
          <View style={styles.logoFrame}><Image source={require("../../../../assets/kemenhutlogo.png")} style={styles.logo} resizeMode="contain" accessibilityLabel="Logo Kementerian Kehutanan" /></View>
          <View style={{ flex: 1 }}><Text style={styles.ministry}>Kementerian Kehutanan</Text><Text style={styles.institution}>Balai KSDA Kalimantan Timur</Text></View>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"} onPress={toggleTheme} style={styles.themeButton}>
          <Ionicons name={isDark ? "sunny" : "moon-outline"} size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.pageHeading}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={step === 2 ? "Kembali ke pemilihan pegawai" : "Kembali ke portal"} disabled={submitting} onPress={back} style={styles.backButton}><Ionicons name="arrow-back" size={22} color={c.text} /></TouchableOpacity>
            <View style={{ flex: 1 }}><Text style={styles.title}>Pengajuan Surat Tugas</Text><Text style={styles.subtitle}>Buat SPT baru · Tahap {step} dari 3</Text></View>
          </View>
          <View style={styles.steps}>
            <View testID="assignment-step-track" pointerEvents="none" style={styles.stepTrack}>
              <View testID="assignment-step-progress" style={[styles.stepProgress, { width: `${(step - 1) * 50}%` }]} />
            </View>
            {["Pilih pegawai", "Detail tugas", "Terkirim"].map((label, i) => <View key={label} style={styles.stepItem}>
              <View style={[styles.stepCircle, i + 1 <= step && { backgroundColor: c.accent, borderColor: c.accent }]}>
                <Text style={[styles.stepNumber, i + 1 <= step && { color: c.onAccent }]}>{i + 1}</Text>
              </View><Text style={[styles.stepText, i + 1 === step && { color: c.accentFg, fontWeight: "700" }]}>{label}</Text>
            </View>)}
          </View>
          {!!error && <View accessibilityRole="alert" style={styles.errorBox}><Ionicons name="alert-circle-outline" size={20} color={c.danger} /><Text style={styles.errorText}>{error}</Text></View>}
          {step === 1 && <View style={styles.card}>
            <Text style={styles.cardTitle}>Pilih Pegawai</Text>
            <Text style={styles.subtitle}>Cari nama atau NIP, lalu tambahkan pegawai yang akan melaksanakan tugas.</Text>
            {loading && <View style={styles.inline}><ActivityIndicator color={c.accentFg} /><Text style={styles.subtitle}>Memuat daftar pegawai…</Text></View>}
            {!!setupError && <View style={styles.notice}><Text style={styles.subtitle}>{setupError}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void loadSetup()} style={styles.smallButton}><Text style={styles.link}>Coba lagi</Text></TouchableOpacity></View>}
            <View style={styles.searchBox}><Ionicons name="search-outline" size={20} color={c.muted} /><TextInput
              accessibilityLabel="Cari pegawai" placeholder="Cari nama atau NIP pegawai…" placeholderTextColor={c.muted} style={styles.searchInput}
              value={search} onChangeText={value => { setSearch(value); setSearchOpen(value.trim().length >= 2); }}
              onFocus={() => setSearchOpen(search.trim().length >= 2)} maxLength={150} /></View>
            {searchOpen && <View style={styles.results}>
              {!searchMatches(search).length && <Text style={styles.emptyText}>Pegawai tidak ditemukan.</Text>}
              {searchMatches(search).map(emp => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Pilih ${emp.name}`} key={String(emp.id)} onPress={() => chooseEmployee(emp)} style={styles.resultRow}>
                <View style={{ flex: 1 }}><Text style={styles.itemName}>{emp.name}</Text><Text style={styles.subtitle}>{emp.department || emp.nip}</Text></View>
                <Ionicons name={selected.some(v => String(v.id) === String(emp.id)) ? "checkmark-circle" : "add-circle-outline"} size={22} color={c.accentFg} />
              </TouchableOpacity>)}
            </View>}
            <Text style={styles.sectionLabel}>Pegawai yang ditugaskan ({selected.length})</Text>
            {!selected.length ? <Text style={styles.emptyText}>Belum ada pegawai dipilih</Text> : selected.map(emp => <View key={String(emp.id)} style={styles.personRow}>
              <View style={{ flex: 1 }}><Text style={styles.itemName}>{emp.name}</Text><Text style={styles.subtitle}>{emp.department || emp.nip}</Text></View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Hapus ${emp.name}`} style={styles.iconButton} onPress={() => chooseEmployee(emp)}><Ionicons name="close" size={20} color={c.muted} /></TouchableOpacity>
            </View>)}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Lanjutkan" style={[styles.primary, !selected.length && styles.disabled]} disabled={!selected.length} onPress={() => { setError(""); setStep(2); }}>
              <Text style={styles.primaryText}>Lanjutkan</Text><Ionicons name="arrow-forward" size={18} color={c.onAccent} />
            </TouchableOpacity>
          </View>}

          {step === 2 && <>
            <View style={styles.summary}><View style={{ flex: 1 }}><Text style={styles.itemName}>Pegawai yang ditugaskan ({selected.length})</Text><Text style={styles.subtitle}>{selected.map(emp => emp.name).join(", ")}</Text></View><TouchableOpacity accessibilityRole="button" style={styles.smallButton} onPress={() => setStep(1)} disabled={submitting}><Text style={styles.link}>Ubah</Text></TouchableOpacity></View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Detail Surat Tugas</Text><Text style={styles.subtitle}>Jenis tugas dan lokasi</Text>
              <Text style={styles.label}>Jenis tugas *</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Pilih jenis tugas" style={styles.selectButton} disabled={submitting} onPress={() => setPicker({ kind: "task", visible: true })}><Text style={styles.selectText}>{normalizeTaskTypeName(task.nama)}</Text><Ionicons name="chevron-down" size={18} color={c.muted} /></TouchableOpacity>
              {(task.mode_lokasi === "luar_wilayah" || specialTask) && field("Kota / lokasi asal *", kotaAsal, setKotaAsal, "Contoh: Samarinda")}
              {task.mode_lokasi !== "tempat_saja" && field(task.mode_lokasi === "dalam_kawasan" ? "Kota / kabupaten pelaksanaan *" : "Kota / kabupaten tujuan *", kotaTujuan, setKotaTujuan, "Contoh: Kabupaten Kutai Barat")}
              {specialTask && field("Jenis pengawasan / pemeriksaan *", untuk, setUntuk, "Contoh: Pengawasan Pekerjaan Konstruksi")}
              {field(specialTask ? "Paket / nama pekerjaan *" : "Nama kegiatan / maksud tugas *", activity, setActivity, "Uraikan kegiatan yang akan dilaksanakan…", true)}
              <Text style={styles.hint}>Gunakan *kata* untuk istilah yang dicetak miring pada surat.</Text>
              {field(task.mode_lokasi === "dalam_kawasan" ? "Kawasan / tempat spesifik" : "Tempat spesifik", place, setPlace, "Contoh: Suaka Margasatwa Kelian")}
              {task.mode_lokasi === "tempat_saja" && field("Kota / kabupaten", kotaTujuan, setKotaTujuan, "Contoh: Samarinda")}
              <View style={styles.previewBox}><View style={styles.inline}><Ionicons name="document-text-outline" size={20} color={c.accentFg} /><Text style={styles.itemName}>Pratinjau kalimat surat</Text></View><Text style={styles.previewText}>{preview.split(/(\*[^*]+\*)/g).map((part,i) => <Text key={i} style={part.startsWith("*") ? { fontStyle: "italic" } : undefined}>{part.startsWith("*") ? part.slice(1,-1) : part}</Text>)}</Text></View>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Jadwal penugasan</Text>
              <View style={styles.dateRow}>{dateField(oneDay ? "Tanggal kegiatan *" : "Mulai tanggal *", oneDay ? "single" : "mulai")}{!oneDay && dateField("Sampai tanggal *", "selesai")}</View>
              {checking && <View style={styles.inline}><ActivityIndicator size="small" color={c.accentFg} /><Text style={styles.subtitle}>Memeriksa bentrok jadwal…</Text></View>}
              {!!conflictError && <Text style={styles.hint}>{conflictError}</Text>}
              {selected.length > 1 && <>
                <View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={styles.itemName}>Jadwal personel berbeda hari</Text><Text style={styles.subtitle}>{validPeriod ? "Atur periode masing-masing pegawai dalam jadwal utama." : "Tentukan tanggal mulai dan selesai terlebih dahulu."}</Text></View><Switch accessibilityLabel="Jadwal personel berbeda hari" value={bedaHari} disabled={submitting || !validPeriod} trackColor={{ false: c.control, true: c.accent }} onValueChange={value => {
                  setBedaHari(value); if (value) setPersonDates(prev => Object.fromEntries(selected.map(emp => [String(emp.id), prev[String(emp.id)] || { mulai: start, selesai: oneDay ? start : end || start }])));
                }} /></View>
                {bedaHari && selected.map(emp => <View key={String(emp.id)} style={styles.scheduleRow}><Text style={styles.itemName}>{emp.name}</Text><View style={styles.dateRow}>{dateField("Mulai", "mulai", String(emp.id))}{dateField("Selesai", "selesai", String(emp.id))}</View></View>)}
              </>}
              <View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={styles.itemName}>Buruh / tenaga lapangan (PM)</Text><Text style={styles.subtitle}>Tambahkan pendamping lapangan bila diperlukan.</Text></View><Switch accessibilityLabel="Sertakan tenaga lapangan" value={hasWorkers} disabled={submitting} trackColor={{ false: c.control, true: c.accent }} onValueChange={setHasWorkers} /></View>
              {hasWorkers && <View style={styles.countRow}><Text style={[styles.subtitle, { flex: 1 }]}>Jumlah tenaga lapangan</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Kurangi tenaga lapangan" style={styles.iconButton} disabled={workerCount <= 1 || submitting} onPress={() => setWorkerCount(v => Math.max(1, v - 1))}><Ionicons name="remove" size={20} color={c.text} /></TouchableOpacity><TextInput accessibilityLabel="Jumlah tenaga lapangan" keyboardType="number-pad" style={styles.numberInput} value={String(workerCount)} onChangeText={v => setWorkerCount(Math.max(1, Math.min(100, Number(v) || 1)))} editable={!submitting} /><TouchableOpacity accessibilityRole="button" accessibilityLabel="Tambah tenaga lapangan" style={styles.iconButton} disabled={workerCount >= 100 || submitting} onPress={() => setWorkerCount(v => Math.min(100, v + 1))}><Ionicons name="add" size={20} color={c.text} /></TouchableOpacity></View>}
            </View>
            {!!conflicts.length && <View testID="assignment-conflicts" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.conflictCard}>
              <View style={styles.inline}><Ionicons name="warning-outline" size={20} color={c.warning} /><Text style={styles.conflictTitle}>Jadwal Tugas / Cuti Bentrok</Text></View>
              {conflicts.map((item, i) => <Text key={i} style={styles.conflictText}>
                {item.employee_name && item.range_formatted && (item.type === "surat_tugas" || item.type === "cuti") ? <>
                  <Text style={styles.conflictEmphasis}>{item.employee_name}</Text>: Ada {item.type === "cuti" ? "Cuti Aktif" : "Surat Tugas"} pada tanggal <Text style={styles.conflictDate}>{item.range_formatted}</Text>
                </> : item.message || item.keterangan || "Pegawai memiliki jadwal yang beririsan."}
              </Text>)}
              <Text style={styles.conflictText}>Sesuaikan tanggal atau pegawai sebelum mengirim pengajuan.</Text>
            </View>}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pembiayaan dan persetujuan</Text>
              <Text style={styles.label}>Sumber dana *</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Pilih sumber dana" style={styles.selectButton} disabled={submitting} onPress={() => setPicker({ kind: "funding", visible: true })}><Text style={styles.selectText}>{fundingOptions.find(v => v.id === funding)?.label || "Pilih sumber dana"}</Text><Ionicons name="chevron-down" size={18} color={c.muted} /></TouchableOpacity>
              {funding === "other" && field("Nama sumber dana lainnya *", otherFunding, setOtherFunding, "Ketik sumber dana lainnya…")}
              {structural && <>
                {field("Nama PLH *", plh, value => { setPlh(value); setPlhOpen(value.length >= 2); }, "Nama atau NIP PLH")}
                <Text style={styles.hint}>Diperlukan karena pejabat struktural ikut ditugaskan.</Text>
                {plhOpen && searchMatches(plh).map(emp => <TouchableOpacity accessibilityRole="button" key={String(emp.id)} style={styles.resultRow} onPress={() => { setPlh(emp.name); setPlhOpen(false); }}><Text style={styles.itemName}>{emp.name}</Text></TouchableOpacity>)}
              </>}
              {section && <View style={styles.field}><Text style={styles.label}>Persetujuan Kepala Seksi *</Text><Text style={styles.subtitle}>Pilih sesuai persetujuan yang telah Anda terima.</Text>{([['sudah','Sudah disetujui'],['belum','Belum disetujui']] as const).map(([value,label]) => <TouchableOpacity accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: agreement === value }} key={value} style={styles.radioRow} disabled={submitting} onPress={() => setAgreement(value)}><Ionicons name={agreement === value ? "radio-button-on" : "radio-button-off"} size={22} color={agreement === value ? c.accentFg : c.muted} /><Text style={styles.itemName}>{label}</Text></TouchableOpacity>)}</View>}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Dasar surat dan catatan</Text>
              <Text style={styles.subtitle}>Lampiran opsional · PDF, JPG, PNG atau WebP · Maks. 10 MB</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Pilih berkas dasar surat" style={styles.uploadButton} onPress={() => void pickFile()} disabled={submitting}><Ionicons name="attach-outline" size={22} color={c.accentFg} /><Text style={styles.selectText}>{file ? file.name : "Pilih berkas dasar surat"}</Text></TouchableOpacity>
              {file && <TouchableOpacity accessibilityRole="button" style={styles.smallButton} onPress={() => setFile(null)} disabled={submitting}><Text style={styles.link}>Hapus lampiran</Text></TouchableOpacity>}
              {field("Keterangan lainnya (opsional)", notes, setNotes, "Catatan tambahan untuk verifikator…", true)}
            </View>
            <TouchableOpacity accessibilityRole="button" style={styles.secondary} disabled={submitting} onPress={() => setStep(1)}><Text style={styles.itemName}>Kembali ke Personel</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={submitting ? "Mengirim pengajuan" : conflicts.length ? "Jadwal bentrok — perbaiki tanggal" : "Submit Pengajuan"} style={[styles.primary, (submitting || checking || !!conflicts.length) && styles.disabled]} disabled={submitting || checking || !!conflicts.length} onPress={() => void submit()}>{submitting ? <ActivityIndicator color={c.onAccent} /> : <Ionicons name="paper-plane-outline" size={20} color={c.onAccent} />}<Text style={styles.primaryText}>{submitting ? "Mengirim pengajuan…" : conflicts.length ? "Jadwal bentrok — perbaiki tanggal" : "Submit Pengajuan"}</Text></TouchableOpacity>
          </>}
          {step === 3 && <View style={styles.card}>
            <View style={styles.successIcon}><Ionicons name="checkmark-circle-outline" size={52} color={c.accentFg} /></View>
            <Text style={styles.cardTitle}>Pengajuan Surat Tugas Berhasil!</Text><Text style={styles.subtitle}>Pengajuan telah dikirim dan menunggu proses verifikasi. Statusnya dapat dipantau melalui portal.</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali ke Portal" style={styles.primary} onPress={returnToPortal}><Text style={styles.primaryText}>Kembali ke Portal</Text><Ionicons name="arrow-forward" size={18} color={c.onAccent} /></TouchableOpacity>
          </View>}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={picker.visible} transparent animationType="slide" onRequestClose={closePicker}>
        <View style={styles.overlay}><View style={styles.modalCard}>
          <View style={styles.modalHeading}><Text style={styles.cardTitle}>{picker.kind === "task" ? "Pilih Jenis Tugas" : "Pilih Sumber Dana"}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Tutup pilihan" style={styles.iconButton} onPress={closePicker}><Ionicons name="close" size={22} color={c.text} /></TouchableOpacity></View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {(picker.kind === "task" ? taskTypes.map((t,i) => ({ id: String(i), label: normalizeTaskTypeName(t.nama), selected: t.kode === task.kode })) : fundingOptions.map(f => ({ ...f, selected: f.id === funding }))).map(option => <TouchableOpacity accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: option.selected }} key={option.id} style={[styles.optionRow, option.selected && { backgroundColor: c.soft }]} onPress={() => {
              if (picker.kind === "task") { const next = taskTypes[Number(option.id)]; setTask(next); if (next.aturan_durasi === "wajib_1_hari") { setEnd(start); setPersonDates(prev => Object.fromEntries(Object.entries(prev).map(([id,range]) => [id,{mulai:range.mulai,selesai:range.mulai}]))); } }
              else setFunding(option.id);
              closePicker(); setError("");
            }}><Ionicons name={option.selected ? "radio-button-on" : "radio-button-off"} size={22} color={option.selected ? c.accentFg : c.muted} /><Text style={styles.selectText}>{option.label}</Text></TouchableOpacity>)}
          </ScrollView>
        </View></View>
      </Modal>
      <Modal visible={!!dateTarget} transparent animationType="fade" onRequestClose={() => setDateTarget(null)}>
        <View style={styles.overlay}><View style={styles.modalCard}>
          <View style={styles.modalHeading}><Text style={styles.cardTitle}>Pilih tanggal {dateTarget?.part === "selesai" ? "selesai" : dateTarget?.part === "single" ? "kegiatan" : "mulai"}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Tutup kalender" style={styles.iconButton} onPress={() => setDateTarget(null)}><Ionicons name="close" size={22} color={c.text} /></TouchableOpacity></View>
          <ScrollView>
            {!!(bounds.min || bounds.max) && <Text style={styles.hint}>{bounds.min ? `Mulai ${formatPortalDate(bounds.min)}` : ""}{bounds.max ? ` sampai ${formatPortalDate(bounds.max)}` : ""}</Text>}
            <View style={styles.presets}>{[[0,"Hari Ini"],[1,"Besok"],[3,"+3 Hari"],[7,"+7 Hari"]].map(([offset,label]) => {
              const date = new Date(); date.setDate(date.getDate() + Number(offset));
              const disabled = !dateAllowed(dateValue(date));
              return <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} key={String(label)} style={[styles.preset, disabled && styles.disabled]} onPress={() => applyDate(date)}><Text style={styles.link}>{label}</Text></TouchableOpacity>;
            })}</View>
            <View style={styles.calendarHeading}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Bulan sebelumnya" style={styles.iconButton} onPress={() => {if(calMonth===0){setCalMonth(11);setCalYear(v=>v-1);}else setCalMonth(v=>v-1);}}><Ionicons name="chevron-back" size={20} color={c.text} /></TouchableOpacity><Text style={styles.itemName}>{MONTHS[calMonth]} {calYear}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Bulan berikutnya" style={styles.iconButton} onPress={() => {if(calMonth===11){setCalMonth(0);setCalYear(v=>v+1);}else setCalMonth(v=>v+1);}}><Ionicons name="chevron-forward" size={20} color={c.text} /></TouchableOpacity>
            </View>
            <View style={styles.calendarGrid}>{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(day=><Text key={day} style={styles.weekDay}>{day}</Text>)}</View>
            <View style={styles.calendarGrid}>
              {Array.from({length:(new Date(calYear,calMonth,1).getDay()+6)%7},(_,i)=><View key={`empty-${i}`} style={styles.day} />)}
              {Array.from({length:new Date(calYear,calMonth+1,0).getDate()},(_,i)=>{
                const value=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`;
                const disabled = !dateAllowed(value);
                const active = !disabled && activeDate === value;
                return <TouchableOpacity accessibilityRole="button" accessibilityLabel={formatPortalDate(value)} accessibilityState={{selected:active,disabled}} disabled={disabled} key={value} style={[styles.day,active&&{backgroundColor:c.accent},disabled&&styles.disabled]} onPress={()=>applyDate(new Date(calYear,calMonth,i+1))}><Text style={[styles.dayText,active&&{color:c.onAccent,fontWeight:"700"}]}>{i+1}</Text></TouchableOpacity>;
              })}
            </View>
          </ScrollView>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(c: Record<string,string>, width: number) {
  const pad = width < 380 ? 14 : 16;
  return StyleSheet.create({
    root:{flex:1,backgroundColor:c.header},
    appBar:{width:"100%",maxWidth:712,alignSelf:"center",paddingHorizontal:pad,paddingVertical:12,flexDirection:"row",alignItems:"center",gap:12},
    brand:{flex:1,minWidth:0,flexDirection:"row",alignItems:"center",gap:8},
    logoFrame:{padding:4,backgroundColor:"#ffffff",borderRadius:10},logo:{width:36,height:36},
    ministry:{fontSize:14,lineHeight:18,fontWeight:"700",color:"#ffffff"},institution:{fontSize:12,lineHeight:16,color:"#ffffff",marginTop:2},
    themeButton:{width:48,height:48,borderRadius:24,backgroundColor:"rgba(255,255,255,0.12)",borderWidth:1,borderColor:"rgba(255,255,255,0.24)",alignItems:"center",justifyContent:"center"},
    body:{flex:1,minHeight:0,backgroundColor:c.canvas,borderTopLeftRadius:24,borderTopRightRadius:24,overflow:"hidden",marginTop:Platform.OS==="web"?-1:0,paddingTop:Platform.OS==="web"?1:0},
    content:{width:"100%",maxWidth:712,alignSelf:"center",padding:pad,paddingBottom:44,gap:18},
    pageHeading:{flexDirection:"row",alignItems:"center",gap:12},backButton:{width:44,height:44,borderRadius:14,borderWidth:1,borderColor:c.border,backgroundColor:c.card,alignItems:"center",justifyContent:"center"},
    title:{fontSize:18,fontWeight:"700",color:c.text},subtitle:{fontSize:12,lineHeight:18,color:c.muted,flexShrink:1},
    steps:{flexDirection:"row",justifyContent:"space-between",position:"relative"},stepTrack:{position:"absolute",left:"16.666667%",right:"16.666667%",top:12,height:2,borderRadius:1,backgroundColor:c.border},stepProgress:{height:2,borderRadius:1,backgroundColor:c.accent},stepItem:{flex:1,alignItems:"center",justifyContent:"center",gap:6},stepCircle:{width:26,height:26,borderRadius:13,backgroundColor:c.canvas,borderWidth:1,borderColor:c.control,alignItems:"center",justifyContent:"center"},stepNumber:{fontSize:12,fontWeight:"600",color:c.muted},stepText:{fontSize:11,color:c.muted,textAlign:"center"},
    card:{padding:pad,borderWidth:1,borderColor:c.border,borderRadius:20,backgroundColor:c.card,gap:12},
    cardTitle:{fontSize:16,fontWeight:"700",color:c.text,flexShrink:1},field:{gap:6,marginBottom:4},label:{fontSize:12,fontWeight:"600",color:c.muted},
    input:{minHeight:48,paddingHorizontal:12,paddingVertical:12,borderWidth:1,borderColor:c.control,borderRadius:12,fontSize:14,color:c.text,backgroundColor:c.card,outlineColor:c.accent},textarea:{minHeight:92,textAlignVertical:"top",lineHeight:21},
    inline:{flexDirection:"row",alignItems:"center",gap:8},notice:{padding:12,backgroundColor:c.surface,borderRadius:12,gap:6},
    searchBox:{flexDirection:"row",alignItems:"center",gap:8,borderWidth:1,borderColor:c.control,borderRadius:12,paddingHorizontal:12},searchInput:{flex:1,minWidth:0,minHeight:48,fontSize:14,color:c.text,paddingVertical:12,outlineColor:c.accent},
    results:{borderWidth:1,borderColor:c.border,borderRadius:12,overflow:"hidden"},resultRow:{minHeight:52,padding:12,flexDirection:"row",alignItems:"center",gap:8,borderBottomWidth:1,borderBottomColor:c.border},
    sectionLabel:{fontSize:12,fontWeight:"600",color:c.muted,marginTop:6},emptyText:{fontSize:13,lineHeight:20,color:c.muted,paddingVertical:12},personRow:{minHeight:52,flexDirection:"row",alignItems:"center",gap:8,paddingBottom:8,borderBottomWidth:1,borderBottomColor:c.border},itemName:{fontSize:13,fontWeight:"600",color:c.text,flexShrink:1},
    primary:{minHeight:48,paddingHorizontal:16,paddingVertical:13,borderRadius:14,backgroundColor:c.accent,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},primaryText:{fontSize:14,fontWeight:"700",color:c.onAccent},disabled:{opacity:0.5},
    secondary:{minHeight:48,padding:12,borderWidth:1,borderColor:c.control,borderRadius:14,backgroundColor:c.card,alignItems:"center",justifyContent:"center"},
    summary:{flexDirection:"row",alignItems:"center",gap:8,padding:pad,borderWidth:1,borderColor:c.border,borderRadius:16,backgroundColor:c.card},smallButton:{minHeight:44,paddingHorizontal:8,justifyContent:"center",alignSelf:"flex-start"},link:{fontSize:12,fontWeight:"600",color:c.accentFg},
    selectButton:{minHeight:48,borderWidth:1,borderColor:c.control,borderRadius:12,padding:12,flexDirection:"row",alignItems:"center",gap:8},selectText:{fontSize:14,color:c.text,flex:1,lineHeight:20},hint:{fontSize:12,lineHeight:18,color:c.muted},
    dateRow:{flexDirection:"row",gap:12},dateButton:{marginTop:6,minHeight:48,borderWidth:1,borderColor:c.control,borderRadius:12,padding:10,flexDirection:"row",alignItems:"center",gap:6},dateText:{fontSize:12,lineHeight:18,color:c.text,flex:1,fontVariant:["tabular-nums"]},
    switchRow:{flexDirection:"row",alignItems:"center",gap:12,paddingTop:12,borderTopWidth:1,borderTopColor:c.border},scheduleRow:{gap:10,paddingTop:12,borderTopWidth:1,borderTopColor:c.border},
    iconButton:{width:44,height:44,alignItems:"center",justifyContent:"center",borderRadius:12,backgroundColor:c.surface},countRow:{flexDirection:"row",alignItems:"center",gap:6},numberInput:{width:44,height:44,textAlign:"center",borderWidth:1,borderColor:c.control,borderRadius:8,fontSize:14,color:c.text,outlineColor:c.accent},
    radioRow:{minHeight:48,flexDirection:"row",alignItems:"center",gap:8},uploadButton:{minHeight:60,flexDirection:"row",alignItems:"center",gap:8,padding:12,borderWidth:1,borderColor:c.control,borderRadius:12},
    previewBox:{backgroundColor:c.soft,borderWidth:1,borderColor:c.softBorder,borderRadius:12,padding:12,gap:10,marginTop:8},previewText:{fontSize:13,lineHeight:21,color:c.text},
    conflictEmphasis:{fontWeight:"700"},conflictDate:{fontWeight:"700",textDecorationLine:"underline",textDecorationColor:"#fbbf24"},
    conflictCard:{backgroundColor:c.warningBg,borderWidth:1,borderColor:c.warningBorder,borderRadius:16,padding:pad,gap:10},conflictTitle:{fontSize:14,fontWeight:"700",color:c.warning,flexShrink:1},conflictText:{fontSize:13,lineHeight:20,color:c.warning},
    errorBox:{backgroundColor:c.card,borderWidth:1,borderColor:c.danger,borderRadius:12,padding:12,flexDirection:"row",alignItems:"flex-start",gap:8},errorText:{fontSize:13,lineHeight:20,color:c.danger,flexShrink:1},successIcon:{alignSelf:"center",marginVertical:12},
    overlay:{flex:1,backgroundColor:"rgba(0,0,0,0.5)",justifyContent:"flex-end"},modalCard:{width:"100%",maxWidth:600,maxHeight:"90%",alignSelf:"center",backgroundColor:c.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,gap:12},modalHeading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},optionRow:{minHeight:52,padding:12,borderRadius:12,flexDirection:"row",alignItems:"center",gap:12},
    presets:{flexDirection:"row",gap:6},preset:{flex:1,minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:10,backgroundColor:c.surface},calendarHeading:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginVertical:8},calendarGrid:{flexDirection:"row",flexWrap:"wrap"},weekDay:{width:`${100/7}%`,textAlign:"center",fontSize:12,color:c.muted,paddingVertical:8},day:{width:`${100/7}%`,minHeight:44,alignItems:"center",justifyContent:"center",borderRadius:12},dayText:{fontSize:14,color:c.text},
  });
}
