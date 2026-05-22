// Default panitia pemeriksa for the BA Pemeriksaan BMN document.

export interface PemeriksaAnggota {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
}

const makeId = () => "id" + Math.random().toString(36).slice(2);

export const DEFAULT_PEMERIKSA: PemeriksaAnggota[] = [
  {
    id: makeId(),
    nama: "DHENY MARDIONO, S.Hut., M.Sc.",
    nip: "19750314 199903 1 004",
    jabatan: "Kepala Sub Bagian Tata Usaha",
  },
  {
    id: makeId(),
    nama: "HERYANTO SUMANBOWO, S.Hut",
    nip: "19830528 200102 1 001",
    jabatan: "PEH Muda",
  },
  {
    id: makeId(),
    nama: "HARDI PURNAMA",
    nip: "19720201 199703 1 006",
    jabatan: "Penata Administrasi Perlengkapan",
  },
  {
    id: makeId(),
    nama: "TEGAR ANUGRAH, A.Md.Kom.",
    nip: "19990707 202506 1 006",
    jabatan: "Pranata Komputer Terampil",
  },
];

export const newPemeriksaAnggota = (): PemeriksaAnggota => ({
  id: makeId(),
  nama: "",
  nip: "",
  jabatan: "",
});
