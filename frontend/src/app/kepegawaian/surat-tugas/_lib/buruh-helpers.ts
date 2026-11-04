import type { Employee } from "./types";

export const PM_ID_PREFIX = "pm-";

export function isBuruhEmployee(emp?: {
  id?: string | number;
  is_buruh?: boolean;
  nama_lengkap?: string;
  name?: string;
} | null): boolean {
  if (!emp) return false;
  if (emp.is_buruh) return true;
  if (typeof emp.id === "string" && emp.id.startsWith(PM_ID_PREFIX)) return true;
  const name = emp.nama_lengkap || emp.name || "";
  return name.trim().toUpperCase() === "PM";
}

export function createPmEmployee(index: number): Employee {
  return {
    id: `${PM_ID_PREFIX}${index + 1}`,
    nama_lengkap: "PM",
    name: "PM",
    nip: "",
    jabatan: "-",
    is_buruh: true,
  };
}

export function syncEmployeesWithBuruhCount(
  currentEmployees: Employee[],
  targetBuruhCount: number
): Employee[] {
  const realEmployees = currentEmployees.filter((e) => !isBuruhEmployee(e));
  const count = Math.max(0, Math.min(100, targetBuruhCount));
  const buruhEntries: Employee[] = [];
  for (let i = 0; i < count; i++) {
    buruhEntries.push(createPmEmployee(i));
  }
  return [...realEmployees, ...buruhEntries];
}

export function extractBuruhCount(employees: Employee[]): number {
  return employees.filter(isBuruhEmployee).length;
}
