"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { cleanMelaksanakanKegiatanPrefix } from "@/app/kepegawaian/surat-tugas/_lib/activity-helpers";
import {
  EmployeeSelectionStep,
  Employee,
} from "./_components/EmployeeSelectionStep";
import {
  SuratTugasDetailStep,
  JenisTugasType,
  SuratTugasFormData,
} from "./_components/SuratTugasDetailStep";
import { SuratTugasSuccessStep } from "./_components/SuratTugasSuccessStep";

export default function SuratTugasForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: allEmployees = [], isLoading: isSearching } = useQuery({
    queryKey: ["all-employees-list"],
    queryFn: async () => {
      const response = await api.get("/kepegawaian/employees/select");
      return response.data.data || response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const searchResults = allEmployees
    .filter(
      (emp: Employee) =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.nip && emp.nip.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .slice(0, 50);

  const [formData, setFormData] = useState<SuratTugasFormData>({
    nama_kegiatan: "",
    tanggal_mulai: "",
    tanggal_selesai: "",
    sumber_dana: "",
    sumber_dana_other: "",
    keterangan: "",
  });

  // Builder State untuk Detail Kegiatan (Synced 100% dengan /kepegawaian/surat-tugas/create)
  const [jenisTugas, setJenisTugas] = useState<JenisTugasType>(
    "Perjalanan Dinas ( Lebih dari 1 Hari )"
  );
  const [kotaAsal, setKotaAsal] = useState("Samarinda");
  const [kotaTujuan, setKotaTujuan] = useState("");
  const [namaKegiatanText, setNamaKegiatanText] = useState("");
  const [tempatSpesifik, setTempatSpesifik] = useState("");
  const [namaPlh, setNamaPlh] = useState("");
  const [plhSearchQuery, setPlhSearchQuery] = useState("");
  const [showPlhDropdown, setShowPlhDropdown] = useState(false);
  const plhDropdownRef = useRef<HTMLDivElement>(null);

  const plhSearchResults = allEmployees
    .filter(
      (emp: Employee) =>
        emp.name.toLowerCase().includes(plhSearchQuery.toLowerCase()) ||
        (emp.nip && emp.nip.toLowerCase().includes(plhSearchQuery.toLowerCase()))
    )
    .slice(0, 50);
  const [tandaSetuju, setTandaSetuju] = useState<"sudah" | "belum" | "">("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper: Dapatkan kota penempatan untuk seorang pegawai
  const getEmployeeCity = (emp: Employee): string => {
    // 1. Prioritaskan flag resmi backend seksi_wilayah
    if (emp.seksi_wilayah === "I") return "Berau";
    if (emp.seksi_wilayah === "II") return "Tenggarong";
    if (emp.seksi_wilayah === "III") return "Balikpapan";

    // 2. Fallback pencocokan string satuan_kerja / department
    // Urutkan III -> II -> I untuk menghindari tabrakan substring romawi
    const dept = (emp.department || "").toLowerCase();

    if (
      dept.includes("wilayah iii") ||
      dept.includes("wil iii") ||
      dept.includes("seksi iii") ||
      dept.includes("skw iii") ||
      dept.includes("seksi 3") ||
      dept.includes("balikpapan")
    ) {
      return "Balikpapan";
    }

    if (
      dept.includes("wilayah ii") ||
      dept.includes("wil ii") ||
      dept.includes("seksi ii") ||
      dept.includes("skw ii") ||
      dept.includes("seksi 2") ||
      dept.includes("tenggarong")
    ) {
      return "Tenggarong";
    }

    if (
      dept.includes("wilayah i") ||
      dept.includes("wil i") ||
      dept.includes("seksi i") ||
      dept.includes("skw i") ||
      dept.includes("seksi 1") ||
      dept.includes("berau")
    ) {
      return "Berau";
    }

    return "Samarinda";
  };

  // Helper: Format gabungan nama kota unik, contoh: "Samarinda dan Tenggarong"
  const formatKotaAsal = (cities: string[]): string => {
    const uniqueCities = Array.from(new Set(cities.filter(Boolean)));
    if (uniqueCities.length === 0) return "Samarinda";
    if (uniqueCities.length === 1) return uniqueCities[0];
    if (uniqueCities.length === 2) return `${uniqueCities[0]} dan ${uniqueCities[1]}`;
    return `${uniqueCities.slice(0, -1).join(", ")} dan ${uniqueCities[uniqueCities.length - 1]}`;
  };

  // Deteksi otomatis Kota Asal berdasarkan Penempatan Satker Pegawai
  const detectDefaultKotaAsal = useCallback((employees: Employee[]) => {
    if (!employees || employees.length === 0) return "Samarinda";
    const cities = employees.map(getEmployeeCity);
    return formatKotaAsal(cities);
  }, []);

  useEffect(() => {
    if (selectedEmployees.length > 0) {
      setKotaAsal(detectDefaultKotaAsal(selectedEmployees));
    } else {
      setKotaAsal("Samarinda");
    }
  }, [selectedEmployees, detectDefaultKotaAsal]);

  // Deteksi apakah ada pejabat struktural (Kasubag TU / Kepala Seksi) yang ikut perjalanan
  const hasPejabatStruktural = selectedEmployees.some((emp) => {
    const pos = (emp.position || "").toLowerCase();
    return (
      pos.includes("kepala seksi") ||
      pos.includes("kepala subbagian") ||
      pos.includes("kasubag")
    );
  });

  // Deteksi apakah ada pegawai dari Seksi (bukan Kantor Balai)
  const hasSeksiEmployee = selectedEmployees.some((emp) => {
    if (typeof emp.is_seksi === "boolean") {
      return emp.is_seksi;
    }
    const dept = (emp.department || "").toLowerCase();
    return (
      dept.includes("seksi") ||
      dept.includes("skw") ||
      dept.includes("wilayah") ||
      dept.includes("berau") ||
      dept.includes("tenggarong") ||
      dept.includes("balikpapan")
    ) && !dept.includes("kantor balai") && !dept.includes("balai");
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
      if (
        plhDropdownRef.current &&
        !plhDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPlhDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleEmployee = (emp: Employee) => {
    if (selectedEmployees.find((e) => e.id === emp.id)) {
      setSelectedEmployees((prev) => prev.filter((e) => e.id !== emp.id));
    } else {
      setSelectedEmployees((prev) => [...prev, emp]);
      setSearchQuery("");
      setShowDropdown(false);
    }
  };

  const removeEmployee = (id: string) => {
    setSelectedEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const handleNextStep = () => {
    if (selectedEmployees.length === 0) {
      toast.error("Pilih minimal satu pegawai untuk ditugaskan.");
      return;
    }
    setStep(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ["application/pdf"];
      if (!validTypes.includes(file.type)) {
        toast.error("Format file tidak didukung. Hanya PDF yang diperbolehkan.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Ukuran maksimal file adalah 10MB.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasSeksiEmployee && !tandaSetuju) {
      toast.error("Silakan pilih status persetujuan Kepala Seksi terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalNamaKegiatan = `${jenisTugas}`;
      if (jenisTugas.includes("Perjalanan Dinas")) {
        finalNamaKegiatan = `Melaksanakan Perjalanan Dinas dari ${
          kotaAsal.trim() || "..."
        } ke ${kotaTujuan.trim() || "..."}${
          namaKegiatanText.trim() ? ` dalam rangka ${cleanMelaksanakanKegiatanPrefix(namaKegiatanText)}` : ""
        }${tempatSpesifik.trim() ? ` di ${tempatSpesifik.trim()}` : ""}`;
      } else if (jenisTugas.includes("Melaksanakan Kegiatan")) {
        const cleanNama = cleanMelaksanakanKegiatanPrefix(namaKegiatanText);
        finalNamaKegiatan = `Melaksanakan Kegiatan ${
          cleanNama || "..."
        }${tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : ""}${
          kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : ""
        }`;
      } else {
        finalNamaKegiatan = `Menugaskan Staf untuk ${
          cleanMelaksanakanKegiatanPrefix(namaKegiatanText) || "..."
        }${tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : ""}${
          kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : ""
        }`;
      }

      const calculatedTempatTujuan =
        tempatSpesifik.trim() ||
        kotaTujuan.trim() ||
        (jenisTugas.includes("Perjalanan Dinas") ? kotaAsal.trim() : "");

      const submitData = new FormData();
      submitData.append("maksud_tujuan", finalNamaKegiatan);
      submitData.append("nama_kegiatan", finalNamaKegiatan);
      submitData.append("tempat_tujuan", calculatedTempatTujuan);
      submitData.append("tanggal_mulai", formData.tanggal_mulai);
      submitData.append("tanggal_selesai", formData.tanggal_selesai);
      submitData.append("sumber_dana", formData.sumber_dana);

      if (formData.sumber_dana === "other") {
        submitData.append("sumber_dana_other", formData.sumber_dana_other);
      }
      if (formData.keterangan)
        submitData.append("keterangan", formData.keterangan);
      if (namaPlh) submitData.append("nama_plh", namaPlh);
      if (tandaSetuju) submitData.append("tanda_setuju", tandaSetuju);
      submitData.append("has_seksi_employee", hasSeksiEmployee ? "1" : "0");

      if (selectedFile) {
        submitData.append("file_surat", selectedFile);
      }

      selectedEmployees.forEach((emp, index) => {
        submitData.append(`employees[${index}][id]`, emp.id);
      });

      await api.post("/surat-tugas/submit", submitData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });

      toast.success("Pengajuan surat tugas berhasil disubmit!");
      setStep(3);
    } catch (error: unknown) {
      console.error("Submit failed:", error);
      const axiosErr = error as {
        response?: {
          data?: { message?: string; errors?: Record<string, string[]> };
        };
      };
      if (axiosErr?.response?.data?.errors) {
        const firstError = Object.values(axiosErr.response.data.errors)[0]?.[0];
        toast.error(firstError || "Validasi gagal.");
      } else {
        const msg =
          axiosErr?.response?.data?.message ||
          "Gagal mengirim pengajuan surat tugas.";
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isSearching && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-bold text-slate-700">
            Tunggu sebentar, memuat pegawai...
          </p>
        </div>
      )}
      <div className="w-full pb-20">
        {step === 1 && (
          <EmployeeSelectionStep
            selectedEmployees={selectedEmployees}
            removeEmployee={removeEmployee}
            toggleEmployee={toggleEmployee}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            searchResults={searchResults}
            isSearching={isSearching}
            handleNextStep={handleNextStep}
            dropdownRef={dropdownRef}
          />
        )}
        {step === 2 && (
          <SuratTugasDetailStep
            setStep={setStep}
            selectedEmployees={selectedEmployees}
            handleSubmit={handleSubmit}
            jenisTugas={jenisTugas}
            setJenisTugas={setJenisTugas}
            kotaAsal={kotaAsal}
            setKotaAsal={setKotaAsal}
            kotaTujuan={kotaTujuan}
            setKotaTujuan={setKotaTujuan}
            namaKegiatanText={namaKegiatanText}
            setNamaKegiatanText={setNamaKegiatanText}
            tempatSpesifik={tempatSpesifik}
            setTempatSpesifik={setTempatSpesifik}
            formData={formData}
            setFormData={setFormData}
            hasPejabatStruktural={hasPejabatStruktural}
            namaPlh={namaPlh}
            setNamaPlh={setNamaPlh}
            plhSearchQuery={plhSearchQuery}
            setPlhSearchQuery={setPlhSearchQuery}
            showPlhDropdown={showPlhDropdown}
            setShowPlhDropdown={setShowPlhDropdown}
            plhSearchResults={plhSearchResults}
            plhDropdownRef={plhDropdownRef}
            hasSeksiEmployee={hasSeksiEmployee}
            tandaSetuju={tandaSetuju}
            setTandaSetuju={setTandaSetuju}
            selectedFile={selectedFile}
            handleFileChange={handleFileChange}
            isSubmitting={isSubmitting}
          />
        )}
        {step === 3 && <SuratTugasSuccessStep />}
      </div>
    </>
  );
}
