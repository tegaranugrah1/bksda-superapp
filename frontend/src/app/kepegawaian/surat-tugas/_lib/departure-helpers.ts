/**
 * Helpers untuk menentukan dan memformat kota/tempat keberangkatan per personel.
 */

import { isBuruhEmployee } from "./buruh-helpers";

export interface EmployeeWithDepartment {
  id?: string | number;
  nama_lengkap?: string;
  name?: string;
  department?: string;
  satuan_kerja?: string;
  unit_kerja?: string;
  position?: string;
  jabatan?: string;
  seksi_wilayah?: string | null;
  is_buruh?: boolean;
}

/**
 * Mendapatkan kota keberangkatan default seorang pegawai berdasarkan seksi wilayah / unit kerja.
 * Seksi I: Berau, Seksi II: Tenggarong, Seksi III: Balikpapan, Balai/TU: Samarinda.
 */
export function getEmployeeCity(emp: EmployeeWithDepartment | null | undefined, defaultCity: string = "Samarinda"): string {
  if (!emp) return defaultCity;
  if (isBuruhEmployee(emp)) return defaultCity;

  // 1. Prioritaskan flag resmi backend seksi_wilayah
  if (emp.seksi_wilayah === "I") return "Berau";
  if (emp.seksi_wilayah === "II") return "Tenggarong";
  if (emp.seksi_wilayah === "III") return "Balikpapan";

  // 2. Fallback pencocokan string department / satuan_kerja / unit_kerja / position
  const dept = `${emp.department || ""} ${emp.satuan_kerja || ""} ${emp.unit_kerja || ""} ${emp.position || ""} ${emp.jabatan || ""}`.toLowerCase();

  // Urutkan III -> II -> I untuk menghindari tabrakan substring
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

  return defaultCity;
}

/**
 * Format gabungan nama kota unik menjadi kalimat narasi resmi,
 * contoh: "Samarinda dan Balikpapan" atau "Samarinda, Tenggarong dan Balikpapan"
 */
export function formatKotaAsal(cities: string[], fallback: string = "Samarinda"): string {
  const uniqueCities = Array.from(new Set(cities.map((c) => c?.trim()).filter(Boolean)));
  if (uniqueCities.length === 0) return fallback;
  if (uniqueCities.length === 1) return uniqueCities[0];
  if (uniqueCities.length === 2) return `${uniqueCities[0]} dan ${uniqueCities[1]}`;
  return `${uniqueCities.slice(0, -1).join(", ")} dan ${uniqueCities[uniqueCities.length - 1]}`;
}

/**
 * Deteksi otomatis Kota Asal gabungan berdasarkan personel yang dipilih
 */
export function detectDefaultKotaAsal(employees: EmployeeWithDepartment[], defaultCity: string = "Samarinda"): string {
  if (!employees || employees.length === 0) return defaultCity;
  const cities = employees.map((emp) => getEmployeeCity(emp, defaultCity));
  return formatKotaAsal(cities, defaultCity);
}

/**
 * Cek apakah terdapat lebih dari satu kota keberangkatan unik
 */
export function hasMultipleDepartures(
  departures: Record<string, string> | string[]
): boolean {
  const list = Array.isArray(departures) ? departures : Object.values(departures);
  const unique = new Set(list.map((c) => c?.trim()).filter(Boolean));
  return unique.size > 1;
}
