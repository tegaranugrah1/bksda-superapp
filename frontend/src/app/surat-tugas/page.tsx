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

  // Deteksi otomatis Kota Asal berdasarkan Penempatan Satker Pegawai
  const detectDefaultKotaAsal = useCallback((employees: Employee[]) => {
    if (!employees || employees.length === 0) return "Samarinda";
    const depts = employees.map((e) => (e.department || "").toLowerCase());

    const isAllSeksi1 = depts.every(
      (d) =>
        d.includes("seksi i") ||
        d.includes("seksi 1") ||
        d.includes("wilayah i") ||
        d.includes("berau") ||
        d.includes("skw i")
    );
    if (isAllSeksi1) return "Berau";

    const isAllSeksi2 = depts.every(
      (d) =>
        d.includes("seksi ii") ||
        d.includes("seksi 2") ||
        d.includes("wilayah ii") ||
        d.includes("tenggarong") ||
        d.includes("skw ii")
    );
    if (isAllSeksi2) return "Tenggarong";

    const isAllSeksi3 = depts.every(
      (d) =>
        d.includes("seksi iii") ||
        d.includes("seksi 3") ||
        d.includes("wilayah iii") ||
        d.includes("balikpapan") ||
        d.includes("skw iii")
    );
    if (isAllSeksi3) return "Balikpapan";

    return "Samarinda";
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
    const dept = (emp.department || "").toLowerCase();
    return dept.includes("seksi konservasi");
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
