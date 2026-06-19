export interface EmployeeSelectorItem {
  id: string | number;
  name: string;
  nip?: string | null;
  jabatan?: string | null;
  unit_kerja?: string | null;
}

export interface EmployeeSearchFilters {
  search?: string;
  per_page?: number;
}
