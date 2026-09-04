"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";
import api from "@/lib/api";
import {
  DOCUMENT_LABELS,
  DOCUMENT_LABELS_DIPA,
  FinanceEmployee,
  MOCK_EMPLOYEES,
  getRecipientBankInfo,
} from "@/app/keuangan/_components/finance-data";
import {
  ApiSuratTugas,
  DipaConfig,
  KwitansiConfig,
  MengetahuiOfficial,
  Official,
  PEJABAT_MENGETAHUI_OPTIONS,
  RecipientRow,
  SATUAN_KERJA,
  DEFAULT_SUFFIX,
  DEFAULT_FOLU_ACTIVITY_NAME,
  DEFAULT_SPD_ANGGARAN_HEADER,
  OFFICIALS,
  OFFICIALS_DIPA,
  SpbConfig,
  SpdConfig,
  buildDefaultDipa,
  buildDefaultRinba,
  buildExternalMcuDescription,
  buildUraianForEmployee,
  calculateDipaTotal,
  calculateRinbaTotal,
  cleanNip,
  extractActivityNameFromMaksud,
  extractOriginFromMaksud,
  formatFullDateIndonesia,
  formatNip,
  getRomanMonth,
  isSameEmployee,
} from "@/app/keuangan/_components/templates/shared";
import { Step0IdentitasSt } from "@/app/keuangan/_components/steps/Step0IdentitasSt";
import { Step1RincianBiaya } from "@/app/keuangan/_components/steps/Step1RincianBiaya";
import { Step2PreviewSpj } from "@/app/keuangan/_components/steps/Step2PreviewSpj";

const STEPS = ["1. SPT Panduan", "2. REKAP", "3. Review & Cetak"];
const DEFAULT_SPB_POINT2 =
  "Memerintahkan Pemegang Dana Operasional untuk pembayaran dan membebankan pengeluaran pada Annual Work Plan (AWP) Project FOLU-NC 2&3 IP BKSDA Kalimantan Timur untuk Kode AWP {awpCode} Tahun Anggaran 2026.";
const DEFAULT_SPD_PPK_POIN1 = "FOLU RBC NC 2&3 IP BKSDA KALTIM TA 2026";
const DEFAULT_SPD_INSTANSI = "Balai KSDA Kalimantan Timur";
const DEFAULT_KWITANSI_SUDAH_TERIMA_DARI =
  "Pejabat Pembuat Komitmen FOLU RBC NC 2&3\nIP BKSDA Kalimantan Timur T.A. 2026";

const initialRecipient = (
  employee: FinanceEmployee,
  origin: string,
  destination: string,
  startDate: string,
  endDate: string,
  maksudTujuan?: string,
  tipeAnggaran: "FOLU" | "DIPA" = "FOLU"
): RecipientRow => {
  const rinba = buildDefaultRinba(employee.name, origin, destination, startDate, endDate);
  const dipa = buildDefaultDipa(startDate, endDate);
  const total = tipeAnggaran === "DIPA" ? calculateDipaTotal(dipa) : calculateRinbaTotal(rinba);
  const bankInfo = getRecipientBankInfo(employee.name);
  const lowerName = employee.name.toLowerCase();
  const isTu =
    lowerName.includes("tegar") ||
    lowerName.includes("menik") ||
    lowerName.includes("sukma") ||
    lowerName.includes("dilemma") ||
    (employee.satuanKerja || "").toLowerCase().includes("tata usaha") ||
    (employee.satuanKerja || "").toLowerCase().includes("subbag tu") ||
    (employee.satuanKerja || "").toLowerCase().includes("balai");
  const defaultMengetahui = isTu ? PEJABAT_MENGETAHUI_OPTIONS[1] : PEJABAT_MENGETAHUI_OPTIONS[0];
  const romanMonth = getRomanMonth(startDate);
  const currentYear = startDate ? startDate.slice(0, 4) : "2026";
  const defaultEvidenceSuffix = tipeAnggaran === "DIPA" ? `/${romanMonth}/${currentYear}` : DEFAULT_SUFFIX;

  return {
    id: `employee-${employee.id}`,
    name: employee.name,
    type: "pegawai",
    description: buildUraianForEmployee(employee.name, origin, destination, startDate, endDate, maksudTujuan),
    evidenceNo: "",
    evidenceSuffix: defaultEvidenceSuffix,
    amount: total || (lowerName.includes("tegar") ? 3590000 : 5590000),
    rinba,
    dipa,
    bankName: bankInfo.bank,
    accountNo: bankInfo.accountNo,
    accountHolder: bankInfo.holderName,
    nip: employee.nip,
    rank: employee.rank,
    position: employee.position,
    satuanKerja: employee.satuanKerja || (isTu ? "Subbagian Tata Usaha" : "Seksi Konservasi Wilayah II"),
    mengetahui: defaultMengetahui,
  };
};

export function SpjForm({ spjId }: { spjId?: string | number }) {
  const router = useRouter();
  const isEditMode = Boolean(spjId);

  const { canWrite } = useRole();
  const [step, setStep] = useState(0);
  const [tipeAnggaran, setTipeAnggaran] = useState<"FOLU" | "DIPA">("FOLU");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spjName, setSpjName] = useState(DEFAULT_FOLU_ACTIVITY_NAME);
  const [nomorSpj, setNomorSpj] = useState("SPJ.001/K.18/TU/FOLU-NC-23/KSA.02.01/B/07/2026");
  const [source, setSource] = useState<"linked" | "manual">("linked");
  const [foluLetters, setFoluLetters] = useState<ApiSuratTugas[]>([]);
  const [isLoadingLetters, setIsLoadingLetters] = useState(true);
  const [selectedStId, setSelectedStId] = useState<string>("");
  const [sptNumber, setSptNumber] = useState("ST.685/K.18/TU/FOLU-NC-23/KSA.02.01/B/07/2026");
  const [sptSearch, setSptSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [sptEmployees, setSptEmployees] = useState<FinanceEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<FinanceEmployee[]>([]);
  const [activity, setActivity] = useState({ awpCode: "C.1.1.2.01", name: DEFAULT_FOLU_ACTIVITY_NAME });
  const [travel, setTravel] = useState({
    origin: "Tenggarong",
    destination: "Kabupaten Kutai Barat",
    startDate: "2026-07-10",
    endDate: "2026-07-17",
  });
  const [spbNumber, setSpbNumber] = useState({
    no: "",
    suffix: "/SPB/K.18/FOLU-NC23/05/2026",
  });
  const [spdNumber, setSpdNumber] = useState({
    no: "",
    suffix: "/K.18-TU/FOLU.NC-23/04/2026",
  });

  const [spbConfig, setSpbConfig] = useState<SpbConfig>({
    virtualAccount: "9899410000000115",
    ppkPosition: "Pejabat Pembuat Komitmen IP BKSDA Kalimantan Timur",
    keperluanPrefix: "Pembayaran Biaya",
    point2Text: DEFAULT_SPB_POINT2,
    cityDateText: "Samarinda,",
  });
  const [spdConfig, setSpdConfig] = useState<SpdConfig>({
    ppkPoin1Text: DEFAULT_SPD_PPK_POIN1,
    anggaranHeader: DEFAULT_SPD_ANGGARAN_HEADER,
    instansiPoin9a: DEFAULT_SPD_INSTANSI,
    akunPoin9b: "{awpCode}",
  });
  const [kwitansiConfig, setKwitansiConfig] = useState<KwitansiConfig>({
    sudahTerimaDari: DEFAULT_KWITANSI_SUDAH_TERIMA_DARI,
  });
  const [activeDipaTab, setActiveDipaTab] = useState<"nominatif" | "sptb" | "rinba" | "spby" | "spd">("nominatif");
  const [activeFoluTab, setActiveFoluTab] = useState<"rekap" | "spb" | "kwitansi" | "rinba" | "spd">("rekap");
  const [dipaConfig, setDipaConfig] = useState<DipaConfig>({
    kodeSatker: "143.04.16.693614",
    namaSatker: "Balai Konservasi Sumber Daya Alam Kalimantan Timur",
    noSpDipa: "No. SP DIPA- 143.04.2.693614/2025 Tanggal 23 Desember 2025",
    klasifikasiMak: "7271.REA.001.524111",
    kodeMak: "051.F.077",
    akun: "524111",
    transportMode: "Kendaraan Dinas",
    stDate: "",
    spdDate: "",
    cityDateText: "Samarinda,",
    uraianSptjb: "",
  });
  const [defaultEvidenceSuffix, setDefaultEvidenceSuffix] = useState(DEFAULT_SUFFIX);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [ppk, setPpk] = useState<Official>(OFFICIALS[0]);
  const [pdo, setPdo] = useState<Official>(OFFICIALS[1]);
  const [verifikator, setVerifikator] = useState<Official>(OFFICIALS[2]);
  const [dbEmployees, setDbEmployees] = useState<FinanceEmployee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState("sptjb");

  const allEmployees = useMemo(() => {
    const base = dbEmployees.length > 0 ? dbEmployees : MOCK_EMPLOYEES;
    const missingSelected = selectedEmployees.filter(
      (sel) => !base.some((b) => isSameEmployee(b, sel))
    );
    return [...missingSelected, ...base];
  }, [dbEmployees, selectedEmployees]);

  const pejabatMengetahuiList: MengetahuiOfficial[] = useMemo(() => {
    const matched = allEmployees.filter((emp) => {
      const pos = (emp.position || "").toLowerCase();
      const name = (emp.name || "").toLowerCase();
      return (
        pos.includes("kepala seksi") ||
        pos.includes("kasi") ||
        pos.includes("kasubbag") ||
        pos.includes("kepala subbagian") ||
        pos.includes("kepala sub") ||
        name.includes("suriawati") ||
        name.includes("dheny") ||
        name.includes("yulian") ||
        name.includes("bambang")
      );
    });

    const result: MengetahuiOfficial[] = [];

    matched.forEach((emp) => {
      let shortPos = emp.position || "Pejabat Pengawas";
      if (shortPos.includes("Wilayah II")) shortPos = "Kepala Seksi KSDA Wilayah II";
      else if (shortPos.includes("Wilayah I")) shortPos = "Kepala Seksi KSDA Wilayah I";
      else if (shortPos.includes("Wilayah III")) shortPos = "Kepala Seksi KSDA Wilayah III";
      else if (shortPos.toLowerCase().includes("tata usaha")) shortPos = "Kepala Subbagian Tata Usaha";

      if (!result.some((r) => isSameEmployee({ name: r.name, nik: r.nik }, emp))) {
        result.push({
          name: emp.name,
          nik: formatNip(emp.nip),
          position: shortPos,
        });
      }
    });

    PEJABAT_MENGETAHUI_OPTIONS.forEach((def) => {
      if (!result.some((r) => isSameEmployee({ name: r.name, nik: r.nik }, { name: def.name, nip: def.nik }))) {
        result.push(def);
      }
    });

    return result;
  }, [allEmployees]);

  const applySuratTugas = (letter: ApiSuratTugas) => {
    setSelectedStId(letter.id);
    if (letter.nomor_surat) {
      setSptNumber(letter.nomor_surat);
    }

    const origin = extractOriginFromMaksud(letter.maksud_tujuan);
    const destination = letter.tempat_tujuan || "Kabupaten Kutai Barat";
    const startDate = letter.tanggal_mulai || "2026-08-25";
    const endDate = letter.tanggal_selesai || "2026-09-01";
    const activityName = extractActivityNameFromMaksud(letter.maksud_tujuan);
    const letterMaksud = letter.maksud_tujuan || "";

    setTravel({
      origin,
      destination,
      startDate,
      endDate,
    });

    setSpjName(activityName);

    const isDipa = tipeAnggaran === "DIPA";
    const letterStartDate = letter.tanggal_mulai ? new Date(letter.tanggal_mulai) : new Date();
    const mm = isNaN(letterStartDate.getTime()) ? "05" : String(letterStartDate.getMonth() + 1).padStart(2, "0");
    const yyyy = isNaN(letterStartDate.getTime()) ? "2026" : String(letterStartDate.getFullYear());
    const computedSpbSuffix = isDipa ? `/K.18-TU/KEU/${mm}/${yyyy}` : `/SPB/K.18/FOLU-NC23/${mm}/${yyyy}`;
    const computedSpdSuffix = isDipa ? `/K.18-TU/KEU/${mm}/${yyyy}` : `/K.18-TU/FOLU.NC-23/${mm}/${yyyy}`;
    const computedEvidenceSuffix = isDipa ? `/K.18-TU/KEU/${mm}/${yyyy}` : `/K.18/FOLU.NC-23/${mm}/${yyyy}`;

    setSpbNumber({ no: "", suffix: computedSpbSuffix });
    setSpdNumber({ no: "", suffix: computedSpdSuffix });
    setDefaultEvidenceSuffix(computedEvidenceSuffix);

    if (isDipa) {
      setDipaConfig((prev) => ({
        ...prev,
        maksudTujuan: letterMaksud,
        stDate: formatFullDateIndonesia(startDate),
        spdDate: formatFullDateIndonesia(startDate),
      }));
    }

    if (letter.employees && letter.employees.length > 0) {
      const mappedEmployees: FinanceEmployee[] = letter.employees.map((emp) => {
        const kepegawaianEmp = allEmployees.find(
          (k) =>
            (emp.id && String(k.id) === String(emp.id)) ||
            (emp.nip && cleanNip(k.nip) === cleanNip(emp.nip)) ||
            isSameEmployee(k, { name: emp.nama_lengkap, nip: emp.nip })
        );

        const realRank = kepegawaianEmp?.rank || emp.pangkat_golongan || "Penata Muda (III/a)";
        const realPosition = kepegawaianEmp?.position || emp.jabatan || "Staf";
        const realName = kepegawaianEmp?.name || emp.nama_lengkap;
        const realNip = kepegawaianEmp?.nip || emp.nip;
        const realSatuanKerja =
          kepegawaianEmp?.satuanKerja ||
          (realName.toLowerCase().includes("tegar") || realName.toLowerCase().includes("menik")
            ? "Subbagian Tata Usaha"
            : "Seksi Konservasi Wilayah II");

        const isTu =
          realName.toLowerCase().includes("tegar") ||
          realName.toLowerCase().includes("menik") ||
          realSatuanKerja.toLowerCase().includes("tata usaha") ||
          realSatuanKerja.toLowerCase().includes("subbag tu") ||
          realSatuanKerja.toLowerCase().includes("balai");

        return {
          id: String(emp.id || kepegawaianEmp?.id || `emp-${Date.now()}`),
          name: realName,
          nip: realNip,
          rank: realRank,
          position: realPosition,
          satuanKerja: realSatuanKerja,
          origin: isTu ? "Samarinda" : origin,
          destination: destination,
        };
      });

      setSptEmployees(mappedEmployees);
      setSelectedEmployees(mappedEmployees);
      setRecipients(
        mappedEmployees.map((emp) => ({
          ...initialRecipient(emp, origin, destination, startDate, endDate, letterMaksud, tipeAnggaran),
          evidenceSuffix: computedEvidenceSuffix,
        }))
      );
    } else {
      setSptEmployees([]);
      setSelectedEmployees([]);
      setRecipients([]);
    }
  };

  const fetchSuratTugas = async () => {
    setIsLoadingLetters(true);
    try {
      const resp = await api.get("/surat-tugas", {
        params: { per_page: 200 },
      });
      const allLetters: ApiSuratTugas[] = resp.data?.data || [];
      setFoluLetters(allLetters);
    } catch (err) {
      console.error("Gagal memuat Surat Tugas:", err);
    } finally {
      setIsLoadingLetters(false);
    }
  };

  const fetchKepegawaianEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const resp = await api.get("/kepegawaian/employees", {
        params: { per_page: 500 },
      });
      const rawData = resp.data?.data || [];
      if (rawData.length > 0) {
        const mapped: FinanceEmployee[] = rawData.map((emp: { id: number | string; name?: string; nama_lengkap?: string; nip?: string; position?: string; jabatan?: string; department?: string; satuan_kerja?: string; rank?: string; pangkat_golongan?: string }) => {
          const name = emp.nama_lengkap || emp.name || "";
          const satuanKerja = emp.satuan_kerja || emp.department || "";
          const isTu =
            name.toLowerCase().includes("tegar") ||
            name.toLowerCase().includes("menik") ||
            name.toLowerCase().includes("sukma") ||
            satuanKerja.toLowerCase().includes("tata usaha") ||
            satuanKerja.toLowerCase().includes("subbag tu") ||
            satuanKerja.toLowerCase().includes("balai");
          return {
            id: String(emp.id),
            name,
            nip: emp.nip || "",
            rank: emp.pangkat_golongan || emp.rank || "Penata Muda (III/a)",
            position: emp.jabatan || emp.position || "Staf",
            satuanKerja: satuanKerja || (isTu ? "Subbagian Tata Usaha" : "Seksi Konservasi Wilayah II"),
            origin: isTu ? "Samarinda" : "Tenggarong",
            destination: "Kabupaten Kutai Barat",
          };
        });
        setDbEmployees(mapped);
      }
    } catch (err) {
      console.warn("Could not load Kepegawaian employees, using fallback:", err);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchSuratTugas();
    fetchKepegawaianEmployees();
  }, []);

  useEffect(() => {
    if (!spjId) return;
    const loadExistingSpj = async () => {
      try {
        const res = await api.get(`/api/keuangan/spj/${spjId}`);
        const data = res.data?.data;
        if (!data) return;

        if (data.nomor_spj) setNomorSpj(data.nomor_spj);
        if (data.tipe_anggaran) setTipeAnggaran(data.tipe_anggaran);
        if (data.nama_kegiatan) {
          setSpjName(data.nama_kegiatan);
          setActivity((prev) => ({
            ...prev,
            name: data.nama_kegiatan,
            awpCode: data.kode_awp || prev.awpCode,
          }));
        }
        if (data.nomor_spt) setSptNumber(data.nomor_spt);
        if (data.surat_tugas_id) setSelectedStId(data.surat_tugas_id);
        if (data.asal || data.tujuan) {
          setTravel({
            origin: data.asal || "Samarinda",
            destination: data.tujuan || "Kabupaten Kutai Barat",
            startDate: data.tanggal_mulai ? data.tanggal_mulai.split("T")[0] : "2026-07-10",
            endDate: data.tanggal_selesai ? data.tanggal_selesai.split("T")[0] : "2026-07-17",
          });
        }
        if (data.pejabat_ppk) setPpk(data.pejabat_ppk);
        if (data.pejabat_pdo) setPdo(data.pejabat_pdo);
        if (data.pejabat_verifikator) setVerifikator(data.pejabat_verifikator);
        if (data.recipients && Array.isArray(data.recipients)) {
          const sanitizedRecipients: RecipientRow[] = data.recipients.map((r: any) => ({
            id: String(r.id || `rec-${Date.now()}`),
            name: r.name || "",
            type: r.type === "pihak_ketiga" ? "pihak_ketiga" : "pegawai",
            description: r.description || "",
            evidenceNo: r.evidenceNo || "",
            evidenceSuffix: r.evidenceSuffix || DEFAULT_SUFFIX,
            amount: Number(r.amount) || 0,
            rinba: r.rinba || buildDefaultRinba(r.name || "Petugas", data.asal || "Samarinda", data.tujuan || "Kabupaten Kutai Barat"),
          }));
          setRecipients(sanitizedRecipients);
          const emps: FinanceEmployee[] = sanitizedRecipients
            .filter((r) => r.type === "pegawai")
            .map((r) => ({
              id: r.id,
              name: r.name,
              nip: r.id?.replace("employee-", "") || "",
              rank: "Pelaksana",
              position: "Pegawai",
              origin: data.asal || "Samarinda",
              destination: data.tujuan || "Kabupaten Kutai Barat",
            }));
          if (emps.length > 0) {
            setSelectedEmployees(emps);
          }
        }
        toast.info(`Mode Edit: Memuat data SPJ #${spjId}`);
      } catch (err) {
        console.error("Gagal memuat SPJ untuk diedit:", err);
        toast.error("Gagal memuat data SPJ untuk diedit.");
      }
    };
    loadExistingSpj();
  }, [spjId]);

  const displayedEmployees = useMemo(() => {
    if (source === "linked") {
      if (!employeeSearch.trim()) return sptEmployees;
      const q = employeeSearch.toLowerCase();
      const qNum = cleanNip(employeeSearch);
      return allEmployees.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (qNum && cleanNip(e.nip).includes(qNum)) ||
        e.nip.includes(q)
      );
    }
    if (employeeSearch.trim()) {
      const q = employeeSearch.toLowerCase();
      const qNum = cleanNip(employeeSearch);
      return allEmployees.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        (qNum && cleanNip(e.nip).includes(qNum)) ||
        e.nip.includes(q)
      );
    }
    return [...allEmployees].sort((a, b) => {
      const aSel = selectedEmployees.some((item) => isSameEmployee(item, a));
      const bSel = selectedEmployees.some((item) => isSameEmployee(item, b));
      return (bSel ? 1 : 0) - (aSel ? 1 : 0);
    });
  }, [allEmployees, employeeSearch, selectedEmployees, source, sptEmployees]);

  const total = recipients.reduce((sum, item) => sum + item.amount, 0);
  const documentLabels = tipeAnggaran === "DIPA" ? DOCUMENT_LABELS_DIPA : DOCUMENT_LABELS;
  const documentCounts = useMemo(
    () =>
      documentLabels.map((document) => ({
        ...document,
        count: ["rinba", "spd", "spb", "kuitansi", "rinba-dipa", "spd-dipa"].includes(document.key)
          ? recipients.length
          : 1,
      })),
    [documentLabels, recipients.length]
  );
  const selectedDocumentLabel =
    documentLabels.find((document) => document.key === selectedDocument)?.label ||
    (tipeAnggaran === "DIPA" ? "SPBy" : "SPTJB / Rekap");

  const previewRecipients = useMemo(() => {
    return recipients.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      evidence: r.evidenceNo ? `${r.evidenceNo}${r.evidenceSuffix}` : `          ${r.evidenceSuffix}`,
      amount: r.amount,
      rinba: r.rinba,
      dipa: r.dipa,
      bankName: r.bankName,
      accountNo: r.accountNo,
      accountHolder: r.accountHolder,
      nip: r.nip,
      rank: r.rank,
      position: r.position,
      satuanKerja: r.satuanKerja,
      mengetahui: r.mengetahui,
    }));
  }, [recipients]);

  const FUNDING_SOURCES = [
    {
      key: "FOLU" as const,
      label: "SPJ Dana FOLU Net Sink 2030",
      dotColor: "bg-emerald-500",
    },
    {
      key: "DIPA" as const,
      label: "SPJ Dana DIPA Balai KSDA",
      dotColor: "bg-blue-500",
    },
  ];

  const handleSwitchTipeAnggaran = (type: "FOLU" | "DIPA") => {
    if (type === tipeAnggaran) return;

    const hasEnteredData = recipients.length > 0 || !!selectedStId || !!sptNumber;
    if (hasEnteredData) {
      const confirmSwitch = window.confirm(
        `Beralih sumber dana ke format ${
          type === "DIPA" ? "DIPA Balai KSDA" : "FOLU Net Sink 2030"
        } akan mereset data form saat ini. Apakah Anda yakin ingin melanjutkan?`
      );
      if (!confirmSwitch) return;
    }

    setTipeAnggaran(type);
    setStep(0);
    setSelectedStId("");
    setSptNumber("");
    setSptEmployees([]);
    setSelectedEmployees([]);
    setRecipients([]);

    if (type === "DIPA") {
      setPpk(OFFICIALS_DIPA[0]);
      setPdo(OFFICIALS_DIPA[1]);
      setSelectedDocument("spby-dipa");
      setNomorSpj("SPJ.001/K.18/TU/KEU/VIII/2026");
      setSpdNumber({ no: "", suffix: "/K.18-TU/KEU/01/2026" });
      setSpbNumber({ no: "", suffix: "/K.18-TU/KEU/01/2026" });
      const romanMonth = getRomanMonth(travel.startDate);
      const currentYear = travel.startDate ? travel.startDate.slice(0, 4) : "2026";
      setDefaultEvidenceSuffix(`/${romanMonth}/${currentYear}`);
      setActivity({
        awpCode: "524111",
        name: "Perjalanan Dinas dalam rangka tugas operasional balai",
      });
      setSpjName("Perjalanan Dinas dalam rangka tugas operasional balai");
      toast.info("Beralih ke format SPJ DIPA. Silakan pilih Surat Tugas DIPA.");
    } else {
      setPpk(OFFICIALS[0]);
      setPdo(OFFICIALS[1]);
      setSelectedDocument("sptjb");
      setNomorSpj("SPJ.001/K.18/TU/FOLU-NC-23/VIII/2026");
      setSpdNumber({ no: "", suffix: "/K.18-TU/FOLU.NC-23/04/2026" });
      setSpbNumber({ no: "", suffix: "/SPB/K.18/FOLU-NC23/05/2026" });
      setDefaultEvidenceSuffix(DEFAULT_SUFFIX);
      setActivity({
        awpCode: "C.1.1.2.01",
        name: DEFAULT_FOLU_ACTIVITY_NAME,
      });
      setSpjName(DEFAULT_FOLU_ACTIVITY_NAME);
      toast.info("Beralih ke format SPJ FOLU. Silakan pilih Surat Tugas FOLU.");
    }
  };

  const syncRecipients = (employees: FinanceEmployee[]) =>
    setRecipients((current) => [
      ...employees.map((e) => ({
        ...initialRecipient(e, travel.origin, travel.destination, travel.startDate, travel.endDate, spjName, tipeAnggaran),
        evidenceSuffix: defaultEvidenceSuffix,
      })),
      ...current.filter((item) => item.type === "pihak_ketiga"),
    ]);

  const toggleEmployee = (employee: FinanceEmployee) => {
    const exists = selectedEmployees.some((item) => isSameEmployee(item, employee));
    const next = exists
      ? selectedEmployees.filter((item) => !isSameEmployee(item, employee))
      : [...selectedEmployees, employee];
    setSelectedEmployees(next);
    syncRecipients(next);
  };

  const nextStep = () => {
    if (step === 0) {
      if (!spjName.trim()) {
        toast.error("Nama SPJ tidak boleh kosong.");
        return;
      }
      if (!sptNumber.trim()) {
        toast.error("Nomor SPT Panduan tidak boleh kosong.");
        return;
      }
      if (selectedEmployees.length === 0) {
        toast.error("Pilih minimal satu pegawai personil.");
        return;
      }
    }
    if (step === 1 && recipients.length === 0) {
      toast.error("Minimal harus ada satu penerima di REKAP.");
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const printDocument = () => {
    window.print();
  };

  const handleSaveSpj = async (statusToSave: "Draft" | "Diajukan") => {
    const finalSpjName = spjName.trim() || activity.name.trim();
    if (!finalSpjName) {
      toast.error("Nama SPJ tidak boleh kosong.");
      return;
    }
    if (recipients.length === 0) {
      toast.error("Minimal harus ada satu penerima di REKAP.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nomor_spj: nomorSpj.trim() || undefined,
        nama_kegiatan: finalSpjName,
        tipe_anggaran: tipeAnggaran,
        nomor_spt: sptNumber,
        surat_tugas_id: selectedStId || null,
        sumber_dana: tipeAnggaran === "FOLU" ? "FOLU-NC-23" : "DIPA",
        kode_awp: activity.awpCode,
        satuan_kerja: SATUAN_KERJA,
        asal: travel.origin,
        tujuan: travel.destination,
        tanggal_mulai: travel.startDate,
        tanggal_selesai: travel.endDate,
        pejabat_ppk: ppk,
        pejabat_pdo: pdo,
        pejabat_verifikator: verifikator,
        pejabat_kasubbag: OFFICIALS[3],
        recipients,
        total_anggaran: total,
        employee_count: recipients.length,
        status: statusToSave,
      };

      if (isEditMode && spjId) {
        await api.put(`/api/keuangan/spj/${spjId}`, payload);
        toast.success(
          statusToSave === "Diajukan"
            ? "SPJ berhasil diperbarui dan diajukan!"
            : "SPJ draft berhasil diperbarui!"
        );
      } else {
        await api.post("/api/keuangan/spj", payload);
        toast.success(
          statusToSave === "Diajukan"
            ? "SPJ berhasil disimpan dan diajukan!"
            : "SPJ berhasil disimpan sebagai draft!"
        );
      }
      router.push("/keuangan/spj");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Gagal menyimpan SPJ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canWrite) {
    return (
      <div className="p-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
          <Banknote className="mx-auto h-8 w-8" />
          <h1 className="mt-3 font-bold">Akses terbatas</h1>
          <p className="mt-2 text-sm">Hanya admin dan superadmin yang dapat membuat atau mengubah SPJ.</p>
          <Link href="/keuangan/spj" className="mt-5 inline-block text-sm font-semibold underline">
            Kembali ke daftar SPJ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 p-5 md:p-10 print:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/keuangan/spj" aria-label="Kembali">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              KEUANGAN / SPJ / {isEditMode ? `EDIT #${spjId}` : "BARU"}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {isEditMode ? "Edit SPJ" : "Buat SPJ"}
            </h1>
          </div>
        </div>

        {/* TIPE ANGGARAN DROPDOWN SELECTOR */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-xs font-semibold flex items-center gap-2.5"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                    tipeAnggaran === "FOLU"
                      ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                      : "bg-blue-500 shadow-sm shadow-blue-500/50"
                  }`}
                />
                <span className="text-slate-500 dark:text-slate-400 font-normal">Sumber Dana:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {FUNDING_SOURCES.find((f) => f.key === tipeAnggaran)?.label || tipeAnggaran}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 p-1.5 rounded-xl shadow-lg border-slate-200 dark:border-slate-800"
            >
              <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Pilih Sumber Dana
              </div>
              {FUNDING_SOURCES.map((source) => {
                const isActive = tipeAnggaran === source.key;
                return (
                  <DropdownMenuItem
                    key={source.key}
                    onClick={() => handleSwitchTipeAnggaran(source.key)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      isActive
                        ? "bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${source.dotColor}`} />
                      <span>{source.label}</span>
                    </div>
                    {isActive && (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 ml-2 shrink-0" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto print:hidden">
        <div className="flex min-w-160 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  index < step
                    ? "bg-emerald-100 text-emerald-700"
                    : index === step
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-200"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}
              >
                {index < step ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={`text-xs font-semibold ${
                  index === step ? "text-slate-900 dark:text-white" : "text-slate-400"
                }`}
              >
                {label}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-px flex-1 ${
                    index < step ? "bg-emerald-300" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <Step0IdentitasSt
          tipeAnggaran={tipeAnggaran}
          spjName={spjName}
          setSpjName={setSpjName}
          nomorSpj={nomorSpj}
          setNomorSpj={setNomorSpj}
          source={source}
          setSource={setSource}
          sptSearch={sptSearch}
          setSptSearch={setSptSearch}
          employeeSearch={employeeSearch}
          setEmployeeSearch={setEmployeeSearch}
          sptNumber={sptNumber}
          setSptNumber={setSptNumber}
          selectedStId={selectedStId}
          foluLetters={foluLetters}
          isLoadingLetters={isLoadingLetters}
          isLoadingEmployees={isLoadingEmployees}
          displayedEmployees={displayedEmployees}
          selectedEmployees={selectedEmployees}
          onSelectSuratTugas={applySuratTugas}
          onToggleEmployee={toggleEmployee}
          onRefreshSuratTugas={fetchSuratTugas}
        />
      )}

      {step === 1 && (
        <Step1RincianBiaya
          tipeAnggaran={tipeAnggaran}
          activity={activity}
          setActivity={setActivity}
          spjName={spjName}
          recipients={recipients}
          setRecipients={setRecipients}
          travel={travel}
          activeDipaTab={activeDipaTab}
          setActiveDipaTab={setActiveDipaTab}
          activeFoluTab={activeFoluTab}
          setActiveFoluTab={setActiveFoluTab}
          total={total}
          ppk={ppk}
          setPpk={setPpk}
          pdo={pdo}
          setPdo={setPdo}
          verifikator={verifikator}
          setVerifikator={setVerifikator}
          allEmployees={allEmployees}
          dipaConfig={dipaConfig}
          setDipaConfig={setDipaConfig}
          defaultEvidenceSuffix={defaultEvidenceSuffix}
          setDefaultEvidenceSuffix={setDefaultEvidenceSuffix}
          spbNumber={spbNumber}
          setSpbNumber={setSpbNumber}
          spdNumber={spdNumber}
          setSpdNumber={setSpdNumber}
          spbConfig={spbConfig}
          setSpbConfig={setSpbConfig}
          spdConfig={spdConfig}
          setSpdConfig={setSpdConfig}
          kwitansiConfig={kwitansiConfig}
          setKwitansiConfig={setKwitansiConfig}
          pejabatMengetahuiList={pejabatMengetahuiList}
        />
      )}

      {step === 2 && (
        <Step2PreviewSpj
          documentCounts={documentCounts}
          selectedDocument={selectedDocument}
          setSelectedDocument={setSelectedDocument}
          selectedDocumentLabel={selectedDocumentLabel}
          previewRecipients={previewRecipients}
          activity={activity}
          spjName={spjName}
          travel={travel}
          sptNumber={sptNumber}
          ppk={ppk}
          pdo={pdo}
          verifikator={verifikator}
          total={total}
          spbNumber={spbNumber}
          spdNumber={spdNumber}
          spbConfig={spbConfig}
          spdConfig={spdConfig}
          kwitansiConfig={kwitansiConfig}
          tipeAnggaran={tipeAnggaran}
          dipaConfig={dipaConfig}
          handleSaveSpj={handleSaveSpj}
          isSubmitting={isSubmitting}
          isEditMode={isEditMode}
          printDocument={printDocument}
        />
      )}

      <div className="flex items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-800 print:hidden">
        <Button
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
          disabled={step === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Sebelumnya
        </Button>
        {step < STEPS.length - 1 && (
          <Button onClick={nextStep} className="h-11 rounded-xl bg-amber-600 px-5 hover:bg-amber-500 text-white">
            Lanjut <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
