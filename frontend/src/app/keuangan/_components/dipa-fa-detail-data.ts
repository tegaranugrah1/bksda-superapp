export interface DipaBudgetItem {
  kode: string; // e.g. "000770"
  suffix: string; // e.g. "770"
  nama: string; // e.g. "Uang Harian Petugas dalam rangka Koordinasi"
  kategori: "uang_harian" | "penginapan" | "transport" | "honor" | "operasional" | "lainnya";
}

export interface DipaBudgetEntry {
  id: string;
  // Hierarki FA Detail
  programKode: string; // e.g. "FF" or "WA"
  programNama: string; // e.g. "Program Pengelolaan Hutan Berkelanjutan"
  kegiatanKode: string; // e.g. "7273"
  kegiatanNama: string; // e.g. "Pengelolaan Kawasan Suaka Alam, KPA, dan TB"
  kroKode: string; // e.g. "REA"
  kroNama: string; // e.g. "Konservasi Kawasan/Rehabilitasi Ekosistem"
  roKode: string; // e.g. "003"
  roNama: string; // e.g. "Pengendalian kebakaran di Kawasan Suaka Alam..."
  komponenKode: string; // e.g. "051"
  komponenNama: string; // e.g. "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB"
  subkomponenKode: string; // e.g. "051.0E"
  subkomponenLetter: string; // e.g. "E"
  subkomponenNama: string; // e.g. "Patroli Pencegahan Karhutla, Penyadartahuan..."
  akunKode: string; // e.g. "524111"
  akunNama: string; // e.g. "Belanja Perjalanan Dinas Biasa"
  // Output yang siap disuntikkan ke dokumen DIPA:
  klasifikasiMak: string; // e.g. "7273.REA.003.524111"
  defaultKodeMak: string; // e.g. "051.E.770"
  makPrefix: string; // e.g. "051.E"
  keywords: string[];
  kategoriGrup: "kebakaran" | "bmn" | "satwa" | "patroli" | "pemulihan" | "perencanaan" | "masyarakat" | "umum";
  items: DipaBudgetItem[];
}

export const DIPA_FA_DETAIL_ENTRIES: DipaBudgetEntry[] = [
  {
    "id": "dipa-7269-cbk-001-051.0a-533121",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "CBK",
    "kroNama": "Prasarana Bidang Pertanian, Kehutanan dan Lingkungan Hidup",
    "roKode": "001",
    "roNama": "Prasarana Penyelamatan Tumbuhan dan Satwa Liar",
    "komponenKode": "051",
    "komponenNama": "Prasarana Penyelamatan Tumbuhan dan Satwa Liar",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembangunan Kandang Transit",
    "akunKode": "533121",
    "akunNama": "Belanja Penambahan Nilai Gedung dan Bangunan",
    "klasifikasiMak": "7269.CBK.001.533121",
    "defaultKodeMak": "051.A.749",
    "makPrefix": "051.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "cbk",
      "001",
      "051.0a",
      "533121"
    ],
    "items": [
      {
        "kode": "000749",
        "suffix": "749",
        "nama": "Pembangunan Ruang Pakan untuk Kandang Transit pada Seksi KSDA Wilayah I Berau",
        "kategori": "lainnya"
      },
      {
        "kode": "000750",
        "suffix": "750",
        "nama": "Pembangunan Kandang Ular di Resor CA Teluk Adang",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7269-qah-001-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "QAH",
    "kroNama": "Pelayanan Publik Lainnya",
    "roKode": "001",
    "roNama": "Layanan Penguatan Pemanfaatan TSL yang Berkelanjutan",
    "komponenKode": "051",
    "komponenNama": "Layanan Pemanfaatan TSL secara berkelanjutan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Survey Potensi Untuk Kuota Pengambilan Tumbuhan dan Penangkapan Satwa Liar Jenis Varanus salvator dan Malayophyton reticulatus",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7269.QAH.001.521211",
    "defaultKodeMak": "051.A.001",
    "makPrefix": "051.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "qah",
      "001",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000001",
        "suffix": "001",
        "nama": "Perlengkapan Lapangan dan ATK",
        "kategori": "lainnya"
      },
      {
        "kode": "000002",
        "suffix": "002",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      },
      {
        "kode": "000003",
        "suffix": "003",
        "nama": "Bahan Makan Buruh Kukar dan Samarinda",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7269-qah-001-051.0a-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "QAH",
    "kroNama": "Pelayanan Publik Lainnya",
    "roKode": "001",
    "roNama": "Layanan Penguatan Pemanfaatan TSL yang Berkelanjutan",
    "komponenKode": "051",
    "komponenNama": "Layanan Pemanfaatan TSL secara berkelanjutan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Survey Potensi Untuk Kuota Pengambilan Tumbuhan dan Penangkapan Satwa Liar Jenis Varanus salvator dan Malayophyton reticulatus",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7269.QAH.001.521219",
    "defaultKodeMak": "051.A.005",
    "makPrefix": "051.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "qah",
      "001",
      "051.0a",
      "521219"
    ],
    "items": [
      {
        "kode": "000005",
        "suffix": "005",
        "nama": "Upah Buruh Kukar dan Samarinda",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7269-qah-001-051.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "QAH",
    "kroNama": "Pelayanan Publik Lainnya",
    "roKode": "001",
    "roNama": "Layanan Penguatan Pemanfaatan TSL yang Berkelanjutan",
    "komponenKode": "051",
    "komponenNama": "Layanan Pemanfaatan TSL secara berkelanjutan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Survey Potensi Untuk Kuota Pengambilan Tumbuhan dan Penangkapan Satwa Liar Jenis Varanus salvator dan Malayophyton reticulatus",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7269.QAH.001.524111",
    "defaultKodeMak": "051.A.008",
    "makPrefix": "051.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "qah",
      "001",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000008",
        "suffix": "008",
        "nama": "Uang Harian Petugas di Kukar",
        "kategori": "uang_harian"
      },
      {
        "kode": "000455",
        "suffix": "455",
        "nama": "Transportasi di Kukar",
        "kategori": "transport"
      },
      {
        "kode": "000456",
        "suffix": "456",
        "nama": "Koordinasi dan Konsultasi",
        "kategori": "lainnya"
      },
      {
        "kode": "000499",
        "suffix": "499",
        "nama": "Penginapan di Kukar",
        "kategori": "penginapan"
      },
      {
        "kode": "000500",
        "suffix": "500",
        "nama": "Uang Harian Petugas di Samarinda",
        "kategori": "uang_harian"
      },
      {
        "kode": "000501",
        "suffix": "501",
        "nama": "Penginapan di Samarinda",
        "kategori": "penginapan"
      },
      {
        "kode": "000502",
        "suffix": "502",
        "nama": "Transportasi di Samarinda",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7269-qah-001-051.0b-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "QAH",
    "kroNama": "Pelayanan Publik Lainnya",
    "roKode": "001",
    "roNama": "Layanan Penguatan Pemanfaatan TSL yang Berkelanjutan",
    "komponenKode": "051",
    "komponenNama": "Layanan Pemanfaatan TSL secara berkelanjutan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Penilaian Kelayakan/ Evaluasi Perizinan Jenis",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7269.QAH.001.521211",
    "defaultKodeMak": "051.B.017",
    "makPrefix": "051.B",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "qah",
      "001",
      "051.0b",
      "521211"
    ],
    "items": [
      {
        "kode": "000017",
        "suffix": "017",
        "nama": "Perlengkapan Lapangan",
        "kategori": "lainnya"
      },
      {
        "kode": "000018",
        "suffix": "018",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7269-qah-001-051.0b-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "QAH",
    "kroNama": "Pelayanan Publik Lainnya",
    "roKode": "001",
    "roNama": "Layanan Penguatan Pemanfaatan TSL yang Berkelanjutan",
    "komponenKode": "051",
    "komponenNama": "Layanan Pemanfaatan TSL secara berkelanjutan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Penilaian Kelayakan/ Evaluasi Perizinan Jenis",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7269.QAH.001.524111",
    "defaultKodeMak": "051.B.458",
    "makPrefix": "051.B",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "qah",
      "001",
      "051.0b",
      "524111"
    ],
    "items": [
      {
        "kode": "000458",
        "suffix": "458",
        "nama": "Perjadin Petugas di Nunukan",
        "kategori": "operasional"
      },
      {
        "kode": "000503",
        "suffix": "503",
        "nama": "Perjadin Petugas di Berau",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7269-qah-001-051.0c-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "QAH",
    "kroNama": "Pelayanan Publik Lainnya",
    "roKode": "001",
    "roNama": "Layanan Penguatan Pemanfaatan TSL yang Berkelanjutan",
    "komponenKode": "051",
    "komponenNama": "Layanan Pemanfaatan TSL secara berkelanjutan",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Koordinasi dan Konsultasi pusat dan daerah",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7269.QAH.001.524111",
    "defaultKodeMak": "051.C.460",
    "makPrefix": "051.C",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "qah",
      "001",
      "051.0c",
      "524111"
    ],
    "items": [
      {
        "kode": "000460",
        "suffix": "460",
        "nama": "Perjadin Petugas",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7269-qdb-001-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "QDB",
    "kroNama": "Fasilitasi dan Pembinaan Lembaga",
    "roKode": "001",
    "roNama": "Optimalisasi Pengelolaan Lembaga Konservasi",
    "komponenKode": "051",
    "komponenNama": "Optimalisasi Pengelolaan LK Umum",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Monev Lembaga Konservasi",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7269.QDB.001.521211",
    "defaultKodeMak": "051.A.026",
    "makPrefix": "051.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "qdb",
      "001",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000026",
        "suffix": "026",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7269-qdb-001-051.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "QDB",
    "kroNama": "Fasilitasi dan Pembinaan Lembaga",
    "roKode": "001",
    "roNama": "Optimalisasi Pengelolaan Lembaga Konservasi",
    "komponenKode": "051",
    "komponenNama": "Optimalisasi Pengelolaan LK Umum",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Monev Lembaga Konservasi",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7269.QDB.001.524111",
    "defaultKodeMak": "051.A.462",
    "makPrefix": "051.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "qdb",
      "001",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000462",
        "suffix": "462",
        "nama": "Uang Harian Petugas ke Balikpapan (Balai)",
        "kategori": "uang_harian"
      },
      {
        "kode": "000504",
        "suffix": "504",
        "nama": "Uang Harian Petugas ke Balikpapan (SKSDA Wil Balikpapan)",
        "kategori": "uang_harian"
      },
      {
        "kode": "000505",
        "suffix": "505",
        "nama": "Penginapan Petugas ke Balikpapan",
        "kategori": "penginapan"
      },
      {
        "kode": "000506",
        "suffix": "506",
        "nama": "Transportasi",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7269-qma-001-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "QMA",
    "kroNama": "Data dan Informasi Publik",
    "roKode": "001",
    "roNama": "Penguatan Data dan Informasi Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Survey/Monitoring Keanekaragaman Hayati Lima Taksa",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Inventarisasi / Survei Populasi Bekantan di CA Teluk Adang",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7269.QMA.001.521211",
    "defaultKodeMak": "051.A.029",
    "makPrefix": "051.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "qma",
      "001",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000029",
        "suffix": "029",
        "nama": "Alat dan Bahan serta obat-obatan",
        "kategori": "lainnya"
      },
      {
        "kode": "000031",
        "suffix": "031",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7269-qma-001-051.0a-522141",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "QMA",
    "kroNama": "Data dan Informasi Publik",
    "roKode": "001",
    "roNama": "Penguatan Data dan Informasi Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Survey/Monitoring Keanekaragaman Hayati Lima Taksa",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Inventarisasi / Survei Populasi Bekantan di CA Teluk Adang",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7269.QMA.001.522141",
    "defaultKodeMak": "051.A.507",
    "makPrefix": "051.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "qma",
      "001",
      "051.0a",
      "522141"
    ],
    "items": [
      {
        "kode": "000507",
        "suffix": "507",
        "nama": "Sewa Kendaraan Air",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7269-qma-001-051.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "QMA",
    "kroNama": "Data dan Informasi Publik",
    "roKode": "001",
    "roNama": "Penguatan Data dan Informasi Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Survey/Monitoring Keanekaragaman Hayati Lima Taksa",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Inventarisasi / Survei Populasi Bekantan di CA Teluk Adang",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7269.QMA.001.524111",
    "defaultKodeMak": "051.A.464",
    "makPrefix": "051.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "qma",
      "001",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000464",
        "suffix": "464",
        "nama": "Perjadin Petugas",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7269-reb-001-051.0a-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "REB",
    "kroNama": "Konservasi Jenis/Spesies",
    "roKode": "001",
    "roNama": "Penyelamatan Jenis Tumbuhan dan Satwa Liar",
    "komponenKode": "051",
    "komponenNama": "Penanganan konflik, translokasi, dan pelepasliaran satwa",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Penanganan konflik, translokasi, dan pelepasliaran satwa",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7269.REB.001.521219",
    "defaultKodeMak": "051.A.037",
    "makPrefix": "051.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "reb",
      "001",
      "051.0a",
      "521219"
    ],
    "items": [
      {
        "kode": "000037",
        "suffix": "037",
        "nama": "Biaya Transportasi untuk Penanganan Interaksi Negatif Satwa dengan Manusia",
        "kategori": "transport"
      },
      {
        "kode": "000038",
        "suffix": "038",
        "nama": "Biaya Operasional dalam rangka Penanganan Satwa Translokasi/ Konflik/ Evakuasi/ Sosialisasi / Anjangsana / survey lokasi pelepasli",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7269-reb-001-052.0a-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "REB",
    "kroNama": "Konservasi Jenis/Spesies",
    "roKode": "001",
    "roNama": "Penyelamatan Jenis Tumbuhan dan Satwa Liar",
    "komponenKode": "052",
    "komponenNama": "Penanganan Satwa Konflik dan Bencana",
    "subkomponenKode": "052.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Penanganan Interaksi Negatif Satwa Liar, Translokasi, dan Pelepasliaran Satwa",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7269.REB.001.521219",
    "defaultKodeMak": "052.A.799",
    "makPrefix": "052.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "reb",
      "001",
      "052.0a",
      "521219"
    ],
    "items": [
      {
        "kode": "000799",
        "suffix": "799",
        "nama": "Biaya Operasional dalam rangka Penanganan Satwa Translokasi/ Konflik/ Evakuasi/ Sosialisasi / Anjangsana / survey lokasi pelepasli",
        "kategori": "operasional"
      },
      {
        "kode": "000800",
        "suffix": "800",
        "nama": "Biaya Transportasi untuk Penanganan Interaksi Negatif Satwa dengan Manusia",
        "kategori": "transport"
      },
      {
        "kode": "000801",
        "suffix": "801",
        "nama": "Alat, bahan dan perlengkapan serta perbaikan dalam rangka kegiatan Penanganan Interaksi Negatif Satwa Liar, Translokasi, dan Pele",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7269-reb-001-052.0a-521252",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "REB",
    "kroNama": "Konservasi Jenis/Spesies",
    "roKode": "001",
    "roNama": "Penyelamatan Jenis Tumbuhan dan Satwa Liar",
    "komponenKode": "052",
    "komponenNama": "Penanganan Satwa Konflik dan Bencana",
    "subkomponenKode": "052.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Penanganan Interaksi Negatif Satwa Liar, Translokasi, dan Pelepasliaran Satwa",
    "akunKode": "521252",
    "akunNama": "Belanja Peralatan dan Mesin - Ekstrakomptabel",
    "klasifikasiMak": "7269.REB.001.521252",
    "defaultKodeMak": "052.A.802",
    "makPrefix": "052.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "reb",
      "001",
      "052.0a",
      "521252"
    ],
    "items": [
      {
        "kode": "000802",
        "suffix": "802",
        "nama": "Pembelian Stick Ular",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7269-reb-001-052.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "REB",
    "kroNama": "Konservasi Jenis/Spesies",
    "roKode": "001",
    "roNama": "Penyelamatan Jenis Tumbuhan dan Satwa Liar",
    "komponenKode": "052",
    "komponenNama": "Penanganan Satwa Konflik dan Bencana",
    "subkomponenKode": "052.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Penanganan Interaksi Negatif Satwa Liar, Translokasi, dan Pelepasliaran Satwa",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7269.REB.001.524111",
    "defaultKodeMak": "052.A.803",
    "makPrefix": "052.A",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "reb",
      "001",
      "052.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000803",
        "suffix": "803",
        "nama": "Uang Harian Petugas dalam rangka Koordinasi",
        "kategori": "uang_harian"
      },
      {
        "kode": "000804",
        "suffix": "804",
        "nama": "Penginapan Petugas dalam rangka Koordinasi",
        "kategori": "penginapan"
      },
      {
        "kode": "000805",
        "suffix": "805",
        "nama": "Transportasi Petugas dalam rangka Koordinasi",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7269-reb-001-052.0b-521111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "REB",
    "kroNama": "Konservasi Jenis/Spesies",
    "roKode": "001",
    "roNama": "Penyelamatan Jenis Tumbuhan dan Satwa Liar",
    "komponenKode": "052",
    "komponenNama": "Penanganan Satwa Konflik dan Bencana",
    "subkomponenKode": "052.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Operasionalisasi Perkantoran Pusat Plasma Nutfah",
    "akunKode": "521111",
    "akunNama": "Belanja Keperluan Perkantoran",
    "klasifikasiMak": "7269.REB.001.521111",
    "defaultKodeMak": "052.B.809",
    "makPrefix": "052.B",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "reb",
      "001",
      "052.0b",
      "521111"
    ],
    "items": [
      {
        "kode": "000809",
        "suffix": "809",
        "nama": "Honorarium Tenaga Alih Daya Pengawas untuk Pusat Plasma Nutfah",
        "kategori": "honor"
      },
      {
        "kode": "000810",
        "suffix": "810",
        "nama": "Honorium Tenaga Alih Daya untuk Tenaga Keamanan pada Pusat Plasma Nutfah",
        "kategori": "honor"
      },
      {
        "kode": "000811",
        "suffix": "811",
        "nama": "Honorarium Tenaga Alih Daya Cleaning Service untuk Pusat Plasma Nutfah",
        "kategori": "honor"
      },
      {
        "kode": "000812",
        "suffix": "812",
        "nama": "Honorarium Tenaga Pemelihara Taman dan Halaman Kantor Pusat Plasma Nutfah",
        "kategori": "honor"
      },
      {
        "kode": "000813",
        "suffix": "813",
        "nama": "Langganan Internet Kantor Pusat Plasma Nutfah",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7269-reb-001-052.0b-521811",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "REB",
    "kroNama": "Konservasi Jenis/Spesies",
    "roKode": "001",
    "roNama": "Penyelamatan Jenis Tumbuhan dan Satwa Liar",
    "komponenKode": "052",
    "komponenNama": "Penanganan Satwa Konflik dan Bencana",
    "subkomponenKode": "052.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Operasionalisasi Perkantoran Pusat Plasma Nutfah",
    "akunKode": "521811",
    "akunNama": "Belanja Barang Persediaan Barang Konsumsi",
    "klasifikasiMak": "7269.REB.001.521811",
    "defaultKodeMak": "052.B.814",
    "makPrefix": "052.B",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "reb",
      "001",
      "052.0b",
      "521811"
    ],
    "items": [
      {
        "kode": "000814",
        "suffix": "814",
        "nama": "Keperluan Sehari-hari Perkantoran",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7269-reb-001-052.0b-522111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "REB",
    "kroNama": "Konservasi Jenis/Spesies",
    "roKode": "001",
    "roNama": "Penyelamatan Jenis Tumbuhan dan Satwa Liar",
    "komponenKode": "052",
    "komponenNama": "Penanganan Satwa Konflik dan Bencana",
    "subkomponenKode": "052.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Operasionalisasi Perkantoran Pusat Plasma Nutfah",
    "akunKode": "522111",
    "akunNama": "Belanja Langganan Listrik",
    "klasifikasiMak": "7269.REB.001.522111",
    "defaultKodeMak": "052.B.815",
    "makPrefix": "052.B",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "reb",
      "001",
      "052.0b",
      "522111"
    ],
    "items": [
      {
        "kode": "000815",
        "suffix": "815",
        "nama": "Listrik Kantor Pusat Plasma Nutfah",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7269-reb-001-052.0b-523133",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7269",
    "kegiatanNama": "Konservasi Spesies dan Genetik",
    "kroKode": "REB",
    "kroNama": "Konservasi Jenis/Spesies",
    "roKode": "001",
    "roNama": "Penyelamatan Jenis Tumbuhan dan Satwa Liar",
    "komponenKode": "052",
    "komponenNama": "Penanganan Satwa Konflik dan Bencana",
    "subkomponenKode": "052.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Operasionalisasi Perkantoran Pusat Plasma Nutfah",
    "akunKode": "523133",
    "akunNama": "Belanja Pemeliharaan Jaringan",
    "klasifikasiMak": "7269.REB.001.523133",
    "defaultKodeMak": "052.B.806",
    "makPrefix": "052.B",
    "kategoriGrup": "satwa",
    "keywords": [
      "7269",
      "reb",
      "001",
      "052.0b",
      "523133"
    ],
    "items": [
      {
        "kode": "000806",
        "suffix": "806",
        "nama": "Biaya pemeliharaan jaringan internet",
        "kategori": "lainnya"
      },
      {
        "kode": "000807",
        "suffix": "807",
        "nama": "Biaya pemeliharaan jaringan listrik",
        "kategori": "lainnya"
      },
      {
        "kode": "000808",
        "suffix": "808",
        "nama": "Biaya pemeliharaan jaringan air bersih",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7270-pef-001-054.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "PEF",
    "kroNama": "Sosialisasi dan Diseminasi",
    "roKode": "001",
    "roNama": "Sosialisasi, promosi dan pemasaran serta penggunaan teknologi dalam pemanfaatan jasa lingkungan",
    "komponenKode": "054",
    "komponenNama": "Penyelenggaraan Social Marketing dan Pemasaran Jasa Lingkungan pada KSA, KPA dan TB",
    "subkomponenKode": "054.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Sosialisasi dan Diseminasi Pemanfaatan Jasa Lingkungan (PNBP Wisata)",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7270.PEF.001.521211",
    "defaultKodeMak": "054.A.581",
    "makPrefix": "054.A",
    "kategoriGrup": "umum",
    "keywords": [
      "7270",
      "pef",
      "001",
      "054.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000581",
        "suffix": "581",
        "nama": "Bahan Pendukung Pameran berupa Seragam Baju Pemandu",
        "kategori": "lainnya"
      },
      {
        "kode": "000582",
        "suffix": "582",
        "nama": "ATK, Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7270-pef-001-054.0a-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "PEF",
    "kroNama": "Sosialisasi dan Diseminasi",
    "roKode": "001",
    "roNama": "Sosialisasi, promosi dan pemasaran serta penggunaan teknologi dalam pemanfaatan jasa lingkungan",
    "komponenKode": "054",
    "komponenNama": "Penyelenggaraan Social Marketing dan Pemasaran Jasa Lingkungan pada KSA, KPA dan TB",
    "subkomponenKode": "054.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Sosialisasi dan Diseminasi Pemanfaatan Jasa Lingkungan (PNBP Wisata)",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7270.PEF.001.521219",
    "defaultKodeMak": "054.A.583",
    "makPrefix": "054.A",
    "kategoriGrup": "umum",
    "keywords": [
      "7270",
      "pef",
      "001",
      "054.0a",
      "521219"
    ],
    "items": [
      {
        "kode": "000583",
        "suffix": "583",
        "nama": "Biaya Dekorasi Stand Pameran",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7270-pef-001-054.0a-521811",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "PEF",
    "kroNama": "Sosialisasi dan Diseminasi",
    "roKode": "001",
    "roNama": "Sosialisasi, promosi dan pemasaran serta penggunaan teknologi dalam pemanfaatan jasa lingkungan",
    "komponenKode": "054",
    "komponenNama": "Penyelenggaraan Social Marketing dan Pemasaran Jasa Lingkungan pada KSA, KPA dan TB",
    "subkomponenKode": "054.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Sosialisasi dan Diseminasi Pemanfaatan Jasa Lingkungan (PNBP Wisata)",
    "akunKode": "521811",
    "akunNama": "Belanja Barang Persediaan Barang Konsumsi",
    "klasifikasiMak": "7270.PEF.001.521811",
    "defaultKodeMak": "054.A.585",
    "makPrefix": "054.A",
    "kategoriGrup": "umum",
    "keywords": [
      "7270",
      "pef",
      "001",
      "054.0a",
      "521811"
    ],
    "items": [
      {
        "kode": "000585",
        "suffix": "585",
        "nama": "Materi Pendukung Pameran berupa Tumbler/ Goody Bag/ Leaflet/ Sticker/ Gantungan Kunci",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7270-pef-001-054.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "PEF",
    "kroNama": "Sosialisasi dan Diseminasi",
    "roKode": "001",
    "roNama": "Sosialisasi, promosi dan pemasaran serta penggunaan teknologi dalam pemanfaatan jasa lingkungan",
    "komponenKode": "054",
    "komponenNama": "Penyelenggaraan Social Marketing dan Pemasaran Jasa Lingkungan pada KSA, KPA dan TB",
    "subkomponenKode": "054.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Sosialisasi dan Diseminasi Pemanfaatan Jasa Lingkungan (PNBP Wisata)",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7270.PEF.001.524111",
    "defaultKodeMak": "054.A.584",
    "makPrefix": "054.A",
    "kategoriGrup": "umum",
    "keywords": [
      "7270",
      "pef",
      "001",
      "054.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000584",
        "suffix": "584",
        "nama": "Perjalanan Dinas Petugas",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7270-qma-001-053.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QMA",
    "kroNama": "Data dan Informasi Publik",
    "roKode": "001",
    "roNama": "Pemanfaatan jasa lingkungan wisata alam",
    "komponenKode": "053",
    "komponenNama": "Penyiapan Prakondisi Jasling Wisata Alam",
    "subkomponenKode": "053.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Penyusunan Desain Tapak TWA Padang Luwai (PNBP Wisata)",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7270.QMA.001.521211",
    "defaultKodeMak": "053.A.588",
    "makPrefix": "053.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7270",
      "qma",
      "001",
      "053.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000588",
        "suffix": "588",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000589",
        "suffix": "589",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      },
      {
        "kode": "000590",
        "suffix": "590",
        "nama": "Konsumsi dan Kudapan Pembahasan Dokumen",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7270-qma-001-053.0a-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QMA",
    "kroNama": "Data dan Informasi Publik",
    "roKode": "001",
    "roNama": "Pemanfaatan jasa lingkungan wisata alam",
    "komponenKode": "053",
    "komponenNama": "Penyiapan Prakondisi Jasling Wisata Alam",
    "subkomponenKode": "053.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Penyusunan Desain Tapak TWA Padang Luwai (PNBP Wisata)",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7270.QMA.001.521219",
    "defaultKodeMak": "053.A.591",
    "makPrefix": "053.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7270",
      "qma",
      "001",
      "053.0a",
      "521219"
    ],
    "items": [
      {
        "kode": "000591",
        "suffix": "591",
        "nama": "Upah Harian Masyarakat",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7270-qma-001-053.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QMA",
    "kroNama": "Data dan Informasi Publik",
    "roKode": "001",
    "roNama": "Pemanfaatan jasa lingkungan wisata alam",
    "komponenKode": "053",
    "komponenNama": "Penyiapan Prakondisi Jasling Wisata Alam",
    "subkomponenKode": "053.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Penyusunan Desain Tapak TWA Padang Luwai (PNBP Wisata)",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7270.QMA.001.524111",
    "defaultKodeMak": "053.A.592",
    "makPrefix": "053.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7270",
      "qma",
      "001",
      "053.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000592",
        "suffix": "592",
        "nama": "Uang Harian Petugas",
        "kategori": "uang_harian"
      },
      {
        "kode": "000593",
        "suffix": "593",
        "nama": "Penginapan Petugas",
        "kategori": "penginapan"
      },
      {
        "kode": "000594",
        "suffix": "594",
        "nama": "Transportasi Darat",
        "kategori": "transport"
      },
      {
        "kode": "000595",
        "suffix": "595",
        "nama": "Koordinasi dan Konsultasi ke Pusat",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7270-qma-001-053.0b-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QMA",
    "kroNama": "Data dan Informasi Publik",
    "roKode": "001",
    "roNama": "Pemanfaatan jasa lingkungan wisata alam",
    "komponenKode": "053",
    "komponenNama": "Penyiapan Prakondisi Jasling Wisata Alam",
    "subkomponenKode": "053.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Penyusunan Dokumen Daya Dukung dan Daya Tampung Wisata Alam di TWA Pulau Sangalaki (PNBP Wisata)",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7270.QMA.001.521211",
    "defaultKodeMak": "053.B.596",
    "makPrefix": "053.B",
    "kategoriGrup": "umum",
    "keywords": [
      "7270",
      "qma",
      "001",
      "053.0b",
      "521211"
    ],
    "items": [
      {
        "kode": "000596",
        "suffix": "596",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000597",
        "suffix": "597",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7270-qma-001-053.0b-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QMA",
    "kroNama": "Data dan Informasi Publik",
    "roKode": "001",
    "roNama": "Pemanfaatan jasa lingkungan wisata alam",
    "komponenKode": "053",
    "komponenNama": "Penyiapan Prakondisi Jasling Wisata Alam",
    "subkomponenKode": "053.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Penyusunan Dokumen Daya Dukung dan Daya Tampung Wisata Alam di TWA Pulau Sangalaki (PNBP Wisata)",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7270.QMA.001.521219",
    "defaultKodeMak": "053.B.598",
    "makPrefix": "053.B",
    "kategoriGrup": "umum",
    "keywords": [
      "7270",
      "qma",
      "001",
      "053.0b",
      "521219"
    ],
    "items": [
      {
        "kode": "000598",
        "suffix": "598",
        "nama": "Upah Harian Masyarakat",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7270-qma-001-053.0b-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QMA",
    "kroNama": "Data dan Informasi Publik",
    "roKode": "001",
    "roNama": "Pemanfaatan jasa lingkungan wisata alam",
    "komponenKode": "053",
    "komponenNama": "Penyiapan Prakondisi Jasling Wisata Alam",
    "subkomponenKode": "053.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Penyusunan Dokumen Daya Dukung dan Daya Tampung Wisata Alam di TWA Pulau Sangalaki (PNBP Wisata)",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7270.QMA.001.524111",
    "defaultKodeMak": "053.B.599",
    "makPrefix": "053.B",
    "kategoriGrup": "umum",
    "keywords": [
      "7270",
      "qma",
      "001",
      "053.0b",
      "524111"
    ],
    "items": [
      {
        "kode": "000599",
        "suffix": "599",
        "nama": "Uang Harian Petugas Seksi KSDAW I Berau",
        "kategori": "uang_harian"
      },
      {
        "kode": "000600",
        "suffix": "600",
        "nama": "Uang Harian Petugas Balai",
        "kategori": "uang_harian"
      },
      {
        "kode": "000601",
        "suffix": "601",
        "nama": "Penginapan Petugas Seksi KSDAW I Berau",
        "kategori": "penginapan"
      },
      {
        "kode": "000602",
        "suffix": "602",
        "nama": "Penginapan Petugas Balai",
        "kategori": "penginapan"
      },
      {
        "kode": "000603",
        "suffix": "603",
        "nama": "Penginapan Petugas Balai",
        "kategori": "penginapan"
      },
      {
        "kode": "000604",
        "suffix": "604",
        "nama": "Transportasi Air",
        "kategori": "transport"
      },
      {
        "kode": "000605",
        "suffix": "605",
        "nama": "Transportasi dari Balai",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7270-rag-001-051.0a-532111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "RAG",
    "kroNama": "Sarana Bidang Pertanian, Kehutanan dan Lingkungan Hidup",
    "roKode": "001",
    "roNama": "Penyediaan sarpras dalam rangka mendukung digitalisasi layanan",
    "komponenKode": "051",
    "komponenNama": "Penyediaan sarana digitalisasi layanan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pengadaan Barang dalam rangka mendukung sarana digitalisasi layanan di TWA Pulau Sangalaki (PNBP Wisata Alam)",
    "akunKode": "532111",
    "akunNama": "Belanja Modal Peralatan dan Mesin",
    "klasifikasiMak": "7270.RAG.001.532111",
    "defaultKodeMak": "051.A.794",
    "makPrefix": "051.A",
    "kategoriGrup": "umum",
    "keywords": [
      "7270",
      "rag",
      "001",
      "051.0a",
      "532111"
    ],
    "items": [
      {
        "kode": "000794",
        "suffix": "794",
        "nama": "Pengadaan Penambahan Panel Surya dalam rangka mendukung sarana digitalisasi layanan di TWA Pulau Sangalaki",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7270-rbk-001-052.0a-533111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7270",
    "kegiatanNama": "Pemanfaatan Jasa Lingkungan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "RBK",
    "kroNama": "Prasarana Bidang Pertanian, Kehutanan dan Lingkungan Hidup",
    "roKode": "001",
    "roNama": "Destinasi Wisata Alam yang Dikembangkan Sarprasnya",
    "komponenKode": "052",
    "komponenNama": "Pembangunan dan pemeliharaan sarpras pendukung wisata alam",
    "subkomponenKode": "052.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembangunan Sapras Wisata (PNBP Wisata Alam)",
    "akunKode": "533111",
    "akunNama": "Belanja Modal Gedung dan Bangunan",
    "klasifikasiMak": "7270.RBK.001.533111",
    "defaultKodeMak": "052.A.795",
    "makPrefix": "052.A",
    "kategoriGrup": "umum",
    "keywords": [
      "7270",
      "rbk",
      "001",
      "052.0a",
      "533111"
    ],
    "items": [
      {
        "kode": "000795",
        "suffix": "795",
        "nama": "Konstruksi Pembangunan Tandon Air Tawar dan Perbaikan Instalasi Jaringan Listrik",
        "kategori": "lainnya"
      },
      {
        "kode": "000796",
        "suffix": "796",
        "nama": "Biaya Konsultan Perancangan",
        "kategori": "lainnya"
      },
      {
        "kode": "000797",
        "suffix": "797",
        "nama": "Biaya Konsultan Pengawasan",
        "kategori": "lainnya"
      },
      {
        "kode": "000798",
        "suffix": "798",
        "nama": "Biaya Pengelolaan Kegiatan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Kegiatan persiapan melalui desk Studi potensi Areal Preservasi",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7271.REA.001.521211",
    "defaultKodeMak": "051.A.039",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000039",
        "suffix": "039",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000040",
        "suffix": "040",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0a-521213",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Kegiatan persiapan melalui desk Studi potensi Areal Preservasi",
    "akunKode": "521213",
    "akunNama": "Belanja Honor Output Kegiatan",
    "klasifikasiMak": "7271.REA.001.521213",
    "defaultKodeMak": "051.A.041",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0a",
      "521213"
    ],
    "items": [
      {
        "kode": "000041",
        "suffix": "041",
        "nama": "Ketua",
        "kategori": "lainnya"
      },
      {
        "kode": "000042",
        "suffix": "042",
        "nama": "Sekretaris",
        "kategori": "lainnya"
      },
      {
        "kode": "000043",
        "suffix": "043",
        "nama": "Anggota",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0a-522151",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Kegiatan persiapan melalui desk Studi potensi Areal Preservasi",
    "akunKode": "522151",
    "akunNama": "Belanja Jasa Profesi",
    "klasifikasiMak": "7271.REA.001.522151",
    "defaultKodeMak": "051.A.044",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0a",
      "522151"
    ],
    "items": [
      {
        "kode": "000044",
        "suffix": "044",
        "nama": "Honor Narasumber",
        "kategori": "honor"
      },
      {
        "kode": "000045",
        "suffix": "045",
        "nama": "Honor Moderator",
        "kategori": "honor"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Kegiatan persiapan melalui desk Studi potensi Areal Preservasi",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7271.REA.001.524111",
    "defaultKodeMak": "051.A.046",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000046",
        "suffix": "046",
        "nama": "Perjadin Petugas ke Kukar dan Kutim",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0a-524114",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Kegiatan persiapan melalui desk Studi potensi Areal Preservasi",
    "akunKode": "524114",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Dalam Kota",
    "klasifikasiMak": "7271.REA.001.524114",
    "defaultKodeMak": "051.A.048",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0a",
      "524114"
    ],
    "items": [
      {
        "kode": "000048",
        "suffix": "048",
        "nama": "Paket Metting Fullday",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0b-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Verifikasi Potensi Areal Preservasi di Kabupaten Kutai Kartanegara",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7271.REA.001.521211",
    "defaultKodeMak": "051.B.049",
    "makPrefix": "051.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0b",
      "521211"
    ],
    "items": [
      {
        "kode": "000049",
        "suffix": "049",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000050",
        "suffix": "050",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      },
      {
        "kode": "000051",
        "suffix": "051",
        "nama": "Bahan Makan Buruh",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0b-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Verifikasi Potensi Areal Preservasi di Kabupaten Kutai Kartanegara",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7271.REA.001.521219",
    "defaultKodeMak": "051.B.052",
    "makPrefix": "051.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0b",
      "521219"
    ],
    "items": [
      {
        "kode": "000052",
        "suffix": "052",
        "nama": "Upah Buruh",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0b-522141",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Verifikasi Potensi Areal Preservasi di Kabupaten Kutai Kartanegara",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7271.REA.001.522141",
    "defaultKodeMak": "051.B.053",
    "makPrefix": "051.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0b",
      "522141"
    ],
    "items": [
      {
        "kode": "000053",
        "suffix": "053",
        "nama": "Sewa Kendaraan Air",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0b-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Verifikasi Potensi Areal Preservasi di Kabupaten Kutai Kartanegara",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7271.REA.001.524111",
    "defaultKodeMak": "051.B.054",
    "makPrefix": "051.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0b",
      "524111"
    ],
    "items": [
      {
        "kode": "000054",
        "suffix": "054",
        "nama": "Uang Harian Petugas",
        "kategori": "uang_harian"
      },
      {
        "kode": "000055",
        "suffix": "055",
        "nama": "Penginapan petugas",
        "kategori": "penginapan"
      },
      {
        "kode": "000056",
        "suffix": "056",
        "nama": "Transportasi",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0c-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Rapat pembahasan laporan hasil verifikasi bersama Para Pihak",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7271.REA.001.521211",
    "defaultKodeMak": "051.C.071",
    "makPrefix": "051.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0c",
      "521211"
    ],
    "items": [
      {
        "kode": "000071",
        "suffix": "071",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000072",
        "suffix": "072",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0c-521213",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Rapat pembahasan laporan hasil verifikasi bersama Para Pihak",
    "akunKode": "521213",
    "akunNama": "Belanja Honor Output Kegiatan",
    "klasifikasiMak": "7271.REA.001.521213",
    "defaultKodeMak": "051.C.509",
    "makPrefix": "051.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0c",
      "521213"
    ],
    "items": [
      {
        "kode": "000509",
        "suffix": "509",
        "nama": "Ketua",
        "kategori": "lainnya"
      },
      {
        "kode": "000510",
        "suffix": "510",
        "nama": "Sekretaris",
        "kategori": "lainnya"
      },
      {
        "kode": "000511",
        "suffix": "511",
        "nama": "Anggota",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0c-522151",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Rapat pembahasan laporan hasil verifikasi bersama Para Pihak",
    "akunKode": "522151",
    "akunNama": "Belanja Jasa Profesi",
    "klasifikasiMak": "7271.REA.001.522151",
    "defaultKodeMak": "051.C.512",
    "makPrefix": "051.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0c",
      "522151"
    ],
    "items": [
      {
        "kode": "000512",
        "suffix": "512",
        "nama": "Honor Narasumber",
        "kategori": "honor"
      },
      {
        "kode": "000513",
        "suffix": "513",
        "nama": "Honor Moderator",
        "kategori": "honor"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0c-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Rapat pembahasan laporan hasil verifikasi bersama Para Pihak",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7271.REA.001.524111",
    "defaultKodeMak": "051.C.074",
    "makPrefix": "051.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0c",
      "524111"
    ],
    "items": [
      {
        "kode": "000074",
        "suffix": "074",
        "nama": "Perjadin Petugas ke Kutim",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0c-524114",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Rapat pembahasan laporan hasil verifikasi bersama Para Pihak",
    "akunKode": "524114",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Dalam Kota",
    "klasifikasiMak": "7271.REA.001.524114",
    "defaultKodeMak": "051.C.508",
    "makPrefix": "051.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0c",
      "524114"
    ],
    "items": [
      {
        "kode": "000508",
        "suffix": "508",
        "nama": "Paket Metting Fullday",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-001-051.0d-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi Pembinaan Pengelolaan Areal Preservasi",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Koordinasi/ Konsultasi/ Bimtek ke Pusat dan Daerah",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7271.REA.001.524111",
    "defaultKodeMak": "051.D.077",
    "makPrefix": "051.D",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "001",
      "051.0d",
      "524111"
    ],
    "items": [
      {
        "kode": "000077",
        "suffix": "077",
        "nama": "Perjalanan Dinas dalam rangka Koordinasi/ Konsultasi/ Bimtek ke Pusat dan Daerah",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Reviu Rencana Pemulihan Ekosistem dan Penyusunan Rencana Kerja Tahunan Pemulihan Ekosistem di CA Muara Kaman Sedulang",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7271.REA.002.521211",
    "defaultKodeMak": "051.A.088",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000088",
        "suffix": "088",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000089",
        "suffix": "089",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      },
      {
        "kode": "000514",
        "suffix": "514",
        "nama": "Konsumsi dan Kudapan Pembahasan RPE",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0a-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Reviu Rencana Pemulihan Ekosistem dan Penyusunan Rencana Kerja Tahunan Pemulihan Ekosistem di CA Muara Kaman Sedulang",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7271.REA.002.521219",
    "defaultKodeMak": "051.A.090",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0a",
      "521219"
    ],
    "items": [
      {
        "kode": "000090",
        "suffix": "090",
        "nama": "Upah Harian Masyarakat",
        "kategori": "lainnya"
      },
      {
        "kode": "000091",
        "suffix": "091",
        "nama": "Biaya analisis tanah dan air",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0a-522141",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Reviu Rencana Pemulihan Ekosistem dan Penyusunan Rencana Kerja Tahunan Pemulihan Ekosistem di CA Muara Kaman Sedulang",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7271.REA.002.522141",
    "defaultKodeMak": "051.A.092",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0a",
      "522141"
    ],
    "items": [
      {
        "kode": "000092",
        "suffix": "092",
        "nama": "Sewa Kendaraan Air",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Reviu Rencana Pemulihan Ekosistem dan Penyusunan Rencana Kerja Tahunan Pemulihan Ekosistem di CA Muara Kaman Sedulang",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7271.REA.002.524111",
    "defaultKodeMak": "051.A.518",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000518",
        "suffix": "518",
        "nama": "Uang Harian Petugas",
        "kategori": "uang_harian"
      },
      {
        "kode": "000519",
        "suffix": "519",
        "nama": "Penginapan Petugas",
        "kategori": "penginapan"
      },
      {
        "kode": "000520",
        "suffix": "520",
        "nama": "Transportasi Darat",
        "kategori": "transport"
      },
      {
        "kode": "000521",
        "suffix": "521",
        "nama": "Koordinasi ke Pusat",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0b-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Sosialisasi Rencana Pemulihan Ekosistem",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7271.REA.002.521211",
    "defaultKodeMak": "051.B.522",
    "makPrefix": "051.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0b",
      "521211"
    ],
    "items": [
      {
        "kode": "000522",
        "suffix": "522",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000523",
        "suffix": "523",
        "nama": "Dokumentasi dan pelaporan",
        "kategori": "lainnya"
      },
      {
        "kode": "000524",
        "suffix": "524",
        "nama": "Konsumsi dan Kudapan",
        "kategori": "lainnya"
      },
      {
        "kode": "000530",
        "suffix": "530",
        "nama": "Spanduk",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0b-522141",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Sosialisasi Rencana Pemulihan Ekosistem",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7271.REA.002.522141",
    "defaultKodeMak": "051.B.525",
    "makPrefix": "051.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0b",
      "522141"
    ],
    "items": [
      {
        "kode": "000525",
        "suffix": "525",
        "nama": "Sewa Kendaraan Air",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0b-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Sosialisasi Rencana Pemulihan Ekosistem",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7271.REA.002.524111",
    "defaultKodeMak": "051.B.526",
    "makPrefix": "051.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0b",
      "524111"
    ],
    "items": [
      {
        "kode": "000526",
        "suffix": "526",
        "nama": "Uang Harian Petugas",
        "kategori": "uang_harian"
      },
      {
        "kode": "000527",
        "suffix": "527",
        "nama": "Penginapan Petugas",
        "kategori": "penginapan"
      },
      {
        "kode": "000528",
        "suffix": "528",
        "nama": "Transportasi Darat",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0b-524114",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Sosialisasi Rencana Pemulihan Ekosistem",
    "akunKode": "524114",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Dalam Kota",
    "klasifikasiMak": "7271.REA.002.524114",
    "defaultKodeMak": "051.B.574",
    "makPrefix": "051.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0b",
      "524114"
    ],
    "items": [
      {
        "kode": "000574",
        "suffix": "574",
        "nama": "Bantuan Transportasi Peserta",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0c-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Bimbingan Teknis Pemulihan Ekosistem",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7271.REA.002.521211",
    "defaultKodeMak": "051.C.531",
    "makPrefix": "051.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0c",
      "521211"
    ],
    "items": [
      {
        "kode": "000531",
        "suffix": "531",
        "nama": "Personal Use Peserta, Narasumber, dan Petugas",
        "kategori": "honor"
      },
      {
        "kode": "000532",
        "suffix": "532",
        "nama": "Dokumentasi dan pelaporan",
        "kategori": "lainnya"
      },
      {
        "kode": "000533",
        "suffix": "533",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000534",
        "suffix": "534",
        "nama": "Konsumsi dan Kudapan",
        "kategori": "lainnya"
      },
      {
        "kode": "000539",
        "suffix": "539",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0c-522141",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Bimbingan Teknis Pemulihan Ekosistem",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7271.REA.002.522141",
    "defaultKodeMak": "051.C.535",
    "makPrefix": "051.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0c",
      "522141"
    ],
    "items": [
      {
        "kode": "000535",
        "suffix": "535",
        "nama": "Sewa Kendaraan Air",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0c-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Bimbingan Teknis Pemulihan Ekosistem",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7271.REA.002.524111",
    "defaultKodeMak": "051.C.536",
    "makPrefix": "051.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0c",
      "524111"
    ],
    "items": [
      {
        "kode": "000536",
        "suffix": "536",
        "nama": "Uang Harian Petugas",
        "kategori": "uang_harian"
      },
      {
        "kode": "000537",
        "suffix": "537",
        "nama": "Penginapan Petugas",
        "kategori": "penginapan"
      },
      {
        "kode": "000538",
        "suffix": "538",
        "nama": "Transportasi Darat",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0c-524114",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Bimbingan Teknis Pemulihan Ekosistem",
    "akunKode": "524114",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Dalam Kota",
    "klasifikasiMak": "7271.REA.002.524114",
    "defaultKodeMak": "051.C.575",
    "makPrefix": "051.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0c",
      "524114"
    ],
    "items": [
      {
        "kode": "000575",
        "suffix": "575",
        "nama": "Bantuan Transportasi Peserta",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0d-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Penanaman Intensif bersama masyarakat di CA Teluk Adang dan CA Teluk Apar",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7271.REA.002.521211",
    "defaultKodeMak": "051.D.096",
    "makPrefix": "051.D",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0d",
      "521211"
    ],
    "items": [
      {
        "kode": "000096",
        "suffix": "096",
        "nama": "Pengadaan Ajir",
        "kategori": "lainnya"
      },
      {
        "kode": "000097",
        "suffix": "097",
        "nama": "Pengadaan bahan/peralatan kerja",
        "kategori": "lainnya"
      },
      {
        "kode": "000098",
        "suffix": "098",
        "nama": "Bahan Makan Buruh",
        "kategori": "uang_harian"
      },
      {
        "kode": "000099",
        "suffix": "099",
        "nama": "Pembuatan papan nama",
        "kategori": "lainnya"
      },
      {
        "kode": "000100",
        "suffix": "100",
        "nama": "ATK, Bahan dan Pelaporan",
        "kategori": "lainnya"
      },
      {
        "kode": "000540",
        "suffix": "540",
        "nama": "Pengadaan bibit",
        "kategori": "lainnya"
      },
      {
        "kode": "000541",
        "suffix": "541",
        "nama": "Pengadaan bibit Pemeliharaan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0d-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Penanaman Intensif bersama masyarakat di CA Teluk Adang dan CA Teluk Apar",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7271.REA.002.521219",
    "defaultKodeMak": "051.D.102",
    "makPrefix": "051.D",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0d",
      "521219"
    ],
    "items": [
      {
        "kode": "000102",
        "suffix": "102",
        "nama": "Upah penyiapan lahan dan pembuatan lubang tanam",
        "kategori": "lainnya"
      },
      {
        "kode": "000103",
        "suffix": "103",
        "nama": "Upah pengangkutan bibit dari tempat persemaian ke tempat transit (lokasi penanaman) dan ajir",
        "kategori": "lainnya"
      },
      {
        "kode": "000104",
        "suffix": "104",
        "nama": "Upah penanaman dan pemasangan ajir",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0d-522141",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Penanaman Intensif bersama masyarakat di CA Teluk Adang dan CA Teluk Apar",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7271.REA.002.522141",
    "defaultKodeMak": "051.D.105",
    "makPrefix": "051.D",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0d",
      "522141"
    ],
    "items": [
      {
        "kode": "000105",
        "suffix": "105",
        "nama": "Sewa kapal/longboat",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-002-051.0d-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Pemulihan Ekosistem Daratan yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemulihan Ekosistem Daratan",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Penanaman Intensif bersama masyarakat di CA Teluk Adang dan CA Teluk Apar",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7271.REA.002.524111",
    "defaultKodeMak": "051.D.106",
    "makPrefix": "051.D",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "002",
      "051.0d",
      "524111"
    ],
    "items": [
      {
        "kode": "000106",
        "suffix": "106",
        "nama": "Uang harian pelaksana teknis di lapangan",
        "kategori": "uang_harian"
      },
      {
        "kode": "000108",
        "suffix": "108",
        "nama": "Transportasi Darat",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-004-051.0a-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "004",
    "roNama": "Pemeliharaan Pemulihan Ekosistem yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pemeliharaan Lanjutan Kedua (ke-2) di CA Teluk Adang",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7271.REA.004.521219",
    "defaultKodeMak": "051.A.081",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "004",
      "051.0a",
      "521219"
    ],
    "items": [
      {
        "kode": "000081",
        "suffix": "081",
        "nama": "Pembersihan lapangan/Pemeliharaan tanaman, pengangkutan bibit, penyulaman dan perbaikan saluran air",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-004-051.0a-522141",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "004",
    "roNama": "Pemeliharaan Pemulihan Ekosistem yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pemeliharaan Lanjutan Kedua (ke-2) di CA Teluk Adang",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7271.REA.004.522141",
    "defaultKodeMak": "051.A.082",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "004",
      "051.0a",
      "522141"
    ],
    "items": [
      {
        "kode": "000082",
        "suffix": "082",
        "nama": "Sewa Kendaraan Air",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7271-rea-004-051.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7271",
    "kegiatanNama": "Pemulihan Ekosistem dan Pembinaan Areal Preservasi",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "004",
    "roNama": "Pemeliharaan Pemulihan Ekosistem yang Terdegradasi di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pemeliharaan Lanjutan Kedua (ke-2) di CA Teluk Adang",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7271.REA.004.524111",
    "defaultKodeMak": "051.A.083",
    "makPrefix": "051.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7271",
      "rea",
      "004",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000083",
        "suffix": "083",
        "nama": "Uang harian pelaksana teknis di lapangan",
        "kategori": "uang_harian"
      },
      {
        "kode": "000084",
        "suffix": "084",
        "nama": "Transportasi",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "Data dan Informasi Publik",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Penyusunan RPJPn Kawasan Konservasi",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7272.QMA.001.521211",
    "defaultKodeMak": "051.A.121",
    "makPrefix": "051.A",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000121",
        "suffix": "121",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000122",
        "suffix": "122",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "Data dan Informasi Publik",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Penyusunan RPJPn Kawasan Konservasi",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7272.QMA.001.524111",
    "defaultKodeMak": "051.A.124",
    "makPrefix": "051.A",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000124",
        "suffix": "124",
        "nama": "Perjalanan dinas petugas penyusun RPJPn ke Seksi",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0b-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Lokakarya Penyusunan Dokumen Blok Pengelolaan dan Dokumen",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7272.QMA.001.521211",
    "defaultKodeMak": "051.B.125",
    "makPrefix": "051.B",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0b",
      "521211"
    ],
    "items": [
      {
        "kode": "000125",
        "suffix": "125",
        "nama": "Bahan peserta",
        "kategori": "lainnya"
      },
      {
        "kode": "000126",
        "suffix": "126",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000621",
        "suffix": "621",
        "nama": "Pencetakan Dokumen",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0b-521213",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Lokakarya Penyusunan Dokumen Blok Pengelolaan dan Dokumen",
    "akunKode": "521213",
    "akunNama": "Belanja Honor Output Kegiatan",
    "klasifikasiMak": "7272.QMA.001.521213",
    "defaultKodeMak": "051.B.127",
    "makPrefix": "051.B",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0b",
      "521213"
    ],
    "items": [
      {
        "kode": "000127",
        "suffix": "127",
        "nama": "Ketua",
        "kategori": "lainnya"
      },
      {
        "kode": "000128",
        "suffix": "128",
        "nama": "Sekretaris",
        "kategori": "lainnya"
      },
      {
        "kode": "000129",
        "suffix": "129",
        "nama": "Anggota",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0b-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Lokakarya Penyusunan Dokumen Blok Pengelolaan dan Dokumen",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7272.QMA.001.524111",
    "defaultKodeMak": "051.B.132",
    "makPrefix": "051.B",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0b",
      "524111"
    ],
    "items": [
      {
        "kode": "000132",
        "suffix": "132",
        "nama": "Perjalanan dinas petugas dalam rangka Konsultasi Publik Penyusunan Dokumen Blok Pengelolaan",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0b-524119",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Lokakarya Penyusunan Dokumen Blok Pengelolaan dan Dokumen",
    "akunKode": "524119",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Luar Kota",
    "klasifikasiMak": "7272.QMA.001.524119",
    "defaultKodeMak": "051.B.134",
    "makPrefix": "051.B",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0b",
      "524119"
    ],
    "items": [
      {
        "kode": "000134",
        "suffix": "134",
        "nama": "Paket Meeting Fullboard",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0c-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Konsultasi Publik Penyusunan Dokumen Blok Pengelolaan dan Dokumen RPJP Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7272.QMA.001.521211",
    "defaultKodeMak": "051.C.136",
    "makPrefix": "051.C",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0c",
      "521211"
    ],
    "items": [
      {
        "kode": "000136",
        "suffix": "136",
        "nama": "Bahan peserta",
        "kategori": "lainnya"
      },
      {
        "kode": "000137",
        "suffix": "137",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000626",
        "suffix": "626",
        "nama": "Konsumsi dan Kudapan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0c-521213",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Konsultasi Publik Penyusunan Dokumen Blok Pengelolaan dan Dokumen RPJP Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "akunKode": "521213",
    "akunNama": "Belanja Honor Output Kegiatan",
    "klasifikasiMak": "7272.QMA.001.521213",
    "defaultKodeMak": "051.C.138",
    "makPrefix": "051.C",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0c",
      "521213"
    ],
    "items": [
      {
        "kode": "000138",
        "suffix": "138",
        "nama": "Ketua",
        "kategori": "lainnya"
      },
      {
        "kode": "000139",
        "suffix": "139",
        "nama": "Sekretaris",
        "kategori": "lainnya"
      },
      {
        "kode": "000140",
        "suffix": "140",
        "nama": "Anggota",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0c-522151",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Konsultasi Publik Penyusunan Dokumen Blok Pengelolaan dan Dokumen RPJP Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "akunKode": "522151",
    "akunNama": "Belanja Jasa Profesi",
    "klasifikasiMak": "7272.QMA.001.522151",
    "defaultKodeMak": "051.C.141",
    "makPrefix": "051.C",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0c",
      "522151"
    ],
    "items": [
      {
        "kode": "000141",
        "suffix": "141",
        "nama": "Honor Pembicara / narasumber",
        "kategori": "honor"
      },
      {
        "kode": "000142",
        "suffix": "142",
        "nama": "Honor Moderator",
        "kategori": "honor"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0c-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Konsultasi Publik Penyusunan Dokumen Blok Pengelolaan dan Dokumen RPJP Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7272.QMA.001.524111",
    "defaultKodeMak": "051.C.143",
    "makPrefix": "051.C",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0c",
      "524111"
    ],
    "items": [
      {
        "kode": "000143",
        "suffix": "143",
        "nama": "Perjalanan dinas petugas dalam rangka Konsultasi Publik Penyusunan Dokumen RPJP",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0c-524119",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Konsultasi Publik Penyusunan Dokumen Blok Pengelolaan dan Dokumen RPJP Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "akunKode": "524119",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Luar Kota",
    "klasifikasiMak": "7272.QMA.001.524119",
    "defaultKodeMak": "051.C.146",
    "makPrefix": "051.C",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0c",
      "524119"
    ],
    "items": [
      {
        "kode": "000146",
        "suffix": "146",
        "nama": "Bantuan Transport Peserta",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0d-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Konsultasi Publik di Pusat dokumen Blok dan RPJP SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7272.QMA.001.521211",
    "defaultKodeMak": "051.D.147",
    "makPrefix": "051.D",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0d",
      "521211"
    ],
    "items": [
      {
        "kode": "000147",
        "suffix": "147",
        "nama": "Konsumsi dan Kudapan",
        "kategori": "lainnya"
      },
      {
        "kode": "000148",
        "suffix": "148",
        "nama": "Penggandaan dan Penjilidan laporan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0d-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Konsultasi Publik di Pusat dokumen Blok dan RPJP SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7272.QMA.001.524111",
    "defaultKodeMak": "051.D.149",
    "makPrefix": "051.D",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0d",
      "524111"
    ],
    "items": [
      {
        "kode": "000149",
        "suffix": "149",
        "nama": "Perjalanan Dinas Dalam Rangka Konsultasi Publik dokumen Blok dan RPJP SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0e-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0E",
    "subkomponenLetter": "E",
    "subkomponenNama": "Desiminasi RPJP dan Blok CA Teluk Adang dan CA Teluk Apar",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7272.QMA.001.521211",
    "defaultKodeMak": "051.E.151",
    "makPrefix": "051.E",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0e",
      "521211"
    ],
    "items": [
      {
        "kode": "000151",
        "suffix": "151",
        "nama": "Bahan peserta",
        "kategori": "lainnya"
      },
      {
        "kode": "000152",
        "suffix": "152",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000622",
        "suffix": "622",
        "nama": "Konsumsi dan Kudapan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0e-521213",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0E",
    "subkomponenLetter": "E",
    "subkomponenNama": "Desiminasi RPJP dan Blok CA Teluk Adang dan CA Teluk Apar",
    "akunKode": "521213",
    "akunNama": "Belanja Honor Output Kegiatan",
    "klasifikasiMak": "7272.QMA.001.521213",
    "defaultKodeMak": "051.E.153",
    "makPrefix": "051.E",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0e",
      "521213"
    ],
    "items": [
      {
        "kode": "000153",
        "suffix": "153",
        "nama": "Ketua",
        "kategori": "lainnya"
      },
      {
        "kode": "000154",
        "suffix": "154",
        "nama": "Sekretaris",
        "kategori": "lainnya"
      },
      {
        "kode": "000155",
        "suffix": "155",
        "nama": "Anggota",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0e-522151",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0E",
    "subkomponenLetter": "E",
    "subkomponenNama": "Desiminasi RPJP dan Blok CA Teluk Adang dan CA Teluk Apar",
    "akunKode": "522151",
    "akunNama": "Belanja Jasa Profesi",
    "klasifikasiMak": "7272.QMA.001.522151",
    "defaultKodeMak": "051.E.156",
    "makPrefix": "051.E",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0e",
      "522151"
    ],
    "items": [
      {
        "kode": "000156",
        "suffix": "156",
        "nama": "Honor Pembicara / narasumber",
        "kategori": "honor"
      },
      {
        "kode": "000157",
        "suffix": "157",
        "nama": "Honor Moderator",
        "kategori": "honor"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0e-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0E",
    "subkomponenLetter": "E",
    "subkomponenNama": "Desiminasi RPJP dan Blok CA Teluk Adang dan CA Teluk Apar",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7272.QMA.001.524111",
    "defaultKodeMak": "051.E.158",
    "makPrefix": "051.E",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0e",
      "524111"
    ],
    "items": [
      {
        "kode": "000158",
        "suffix": "158",
        "nama": "Perjalanan dinas petugas dalam rangka Desiminasi RPJP dan Blok CA Teluk Adang dan CA Teluk Apar",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0e-524119",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0E",
    "subkomponenLetter": "E",
    "subkomponenNama": "Desiminasi RPJP dan Blok CA Teluk Adang dan CA Teluk Apar",
    "akunKode": "524119",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Luar Kota",
    "klasifikasiMak": "7272.QMA.001.524119",
    "defaultKodeMak": "051.E.160",
    "makPrefix": "051.E",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0e",
      "524119"
    ],
    "items": [
      {
        "kode": "000160",
        "suffix": "160",
        "nama": "Bantuan Transport Peserta",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0f-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0F",
    "subkomponenLetter": "F",
    "subkomponenNama": "Desiminasi RPJP dan Blok SM Pulau Semama",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7272.QMA.001.521211",
    "defaultKodeMak": "051.F.162",
    "makPrefix": "051.F",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0f",
      "521211"
    ],
    "items": [
      {
        "kode": "000162",
        "suffix": "162",
        "nama": "Bahan peserta",
        "kategori": "lainnya"
      },
      {
        "kode": "000163",
        "suffix": "163",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000623",
        "suffix": "623",
        "nama": "Konsumsi dan Kudapan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0f-521213",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0F",
    "subkomponenLetter": "F",
    "subkomponenNama": "Desiminasi RPJP dan Blok SM Pulau Semama",
    "akunKode": "521213",
    "akunNama": "Belanja Honor Output Kegiatan",
    "klasifikasiMak": "7272.QMA.001.521213",
    "defaultKodeMak": "051.F.164",
    "makPrefix": "051.F",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0f",
      "521213"
    ],
    "items": [
      {
        "kode": "000164",
        "suffix": "164",
        "nama": "Ketua",
        "kategori": "lainnya"
      },
      {
        "kode": "000165",
        "suffix": "165",
        "nama": "Sekretaris",
        "kategori": "lainnya"
      },
      {
        "kode": "000166",
        "suffix": "166",
        "nama": "Anngota",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0f-522151",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0F",
    "subkomponenLetter": "F",
    "subkomponenNama": "Desiminasi RPJP dan Blok SM Pulau Semama",
    "akunKode": "522151",
    "akunNama": "Belanja Jasa Profesi",
    "klasifikasiMak": "7272.QMA.001.522151",
    "defaultKodeMak": "051.F.167",
    "makPrefix": "051.F",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0f",
      "522151"
    ],
    "items": [
      {
        "kode": "000167",
        "suffix": "167",
        "nama": "Honor Pembicara / narasumber",
        "kategori": "honor"
      },
      {
        "kode": "000168",
        "suffix": "168",
        "nama": "Honor Moderator",
        "kategori": "honor"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0f-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0F",
    "subkomponenLetter": "F",
    "subkomponenNama": "Desiminasi RPJP dan Blok SM Pulau Semama",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7272.QMA.001.524111",
    "defaultKodeMak": "051.F.169",
    "makPrefix": "051.F",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0f",
      "524111"
    ],
    "items": [
      {
        "kode": "000169",
        "suffix": "169",
        "nama": "Perjalanan dinas petugas dalam rangka Desiminasi RPJP dan Blok SM Pulau Semama",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0f-524119",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0F",
    "subkomponenLetter": "F",
    "subkomponenNama": "Desiminasi RPJP dan Blok SM Pulau Semama",
    "akunKode": "524119",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Luar Kota",
    "klasifikasiMak": "7272.QMA.001.524119",
    "defaultKodeMak": "051.F.624",
    "makPrefix": "051.F",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0f",
      "524119"
    ],
    "items": [
      {
        "kode": "000624",
        "suffix": "624",
        "nama": "Bantuan Transport Peserta",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0g-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0G",
    "subkomponenLetter": "G",
    "subkomponenNama": "Konsinyasi dalam rangka updating data kawasan konservasi",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7272.QMA.001.521211",
    "defaultKodeMak": "051.G.173",
    "makPrefix": "051.G",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0g",
      "521211"
    ],
    "items": [
      {
        "kode": "000173",
        "suffix": "173",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000174",
        "suffix": "174",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0g-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0G",
    "subkomponenLetter": "G",
    "subkomponenNama": "Konsinyasi dalam rangka updating data kawasan konservasi",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7272.QMA.001.524111",
    "defaultKodeMak": "051.G.176",
    "makPrefix": "051.G",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0g",
      "524111"
    ],
    "items": [
      {
        "kode": "000176",
        "suffix": "176",
        "nama": "Perjalanan dinas petugas Penyusunan Rencana Inventarisasi",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0h-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0H",
    "subkomponenLetter": "H",
    "subkomponenNama": "Penandaan Batas Blok di CA Teluk Apar",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7272.QMA.001.521211",
    "defaultKodeMak": "051.H.177",
    "makPrefix": "051.H",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0h",
      "521211"
    ],
    "items": [
      {
        "kode": "000177",
        "suffix": "177",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000178",
        "suffix": "178",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0h-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0H",
    "subkomponenLetter": "H",
    "subkomponenNama": "Penandaan Batas Blok di CA Teluk Apar",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7272.QMA.001.521219",
    "defaultKodeMak": "051.H.179",
    "makPrefix": "051.H",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0h",
      "521219"
    ],
    "items": [
      {
        "kode": "000179",
        "suffix": "179",
        "nama": "Upah Buruh",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0h-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0H",
    "subkomponenLetter": "H",
    "subkomponenNama": "Penandaan Batas Blok di CA Teluk Apar",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7272.QMA.001.524111",
    "defaultKodeMak": "051.H.183",
    "makPrefix": "051.H",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0h",
      "524111"
    ],
    "items": [
      {
        "kode": "000183",
        "suffix": "183",
        "nama": "Uang Harian di Kabupaten Paser",
        "kategori": "uang_harian"
      },
      {
        "kode": "000184",
        "suffix": "184",
        "nama": "Penginapan",
        "kategori": "penginapan"
      },
      {
        "kode": "000544",
        "suffix": "544",
        "nama": "Transportasi di Kabupaten Paser",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-001-051.0i-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "001",
    "roNama": "Penguatan Efektivitas Perencanaan KSA, KPA, TB Optimalisasi efektivitas perencanaan KK melalui Inventarisasi Potensi, pemolaan, penataan dan penyusunan rencana pengelolaan kawasan konservasi",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0I",
    "subkomponenLetter": "I",
    "subkomponenNama": "Koordinasi dan konsultasi",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7272.QMA.001.524111",
    "defaultKodeMak": "051.I.545",
    "makPrefix": "051.I",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "001",
      "051.0i",
      "524111"
    ],
    "items": [
      {
        "kode": "000545",
        "suffix": "545",
        "nama": "Perjalanan Dinas Koordinasi dan Konsultasi",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-003-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "003",
    "roNama": "Optimalisasi tata kelola kerja sama penguatan fungsi dan pembangunan strategis di KSA, KPA, dan TB Optimalisasi tata kelola kerja sama penguatan fungsi kawasan konservasi dan konservasi keanekaragaman hayati dan kerja sama pembangunan strategis yang tidak dapat dielakkan",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Rapat Rutin dengan mitra / lainnya",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7272.QMA.003.521211",
    "defaultKodeMak": "051.A.109",
    "makPrefix": "051.A",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "003",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000109",
        "suffix": "109",
        "nama": "Konsumsi",
        "kategori": "lainnya"
      },
      {
        "kode": "000110",
        "suffix": "110",
        "nama": "Kudapan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-003-051.0b-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "003",
    "roNama": "Optimalisasi tata kelola kerja sama penguatan fungsi dan pembangunan strategis di KSA, KPA, dan TB Optimalisasi tata kelola kerja sama penguatan fungsi kawasan konservasi dan konservasi keanekaragaman hayati dan kerja sama pembangunan strategis yang tidak dapat dielakkan",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Rapat Koordinasi Terkait Kerjasama",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7272.QMA.003.521211",
    "defaultKodeMak": "051.B.112",
    "makPrefix": "051.B",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "003",
      "051.0b",
      "521211"
    ],
    "items": [
      {
        "kode": "000112",
        "suffix": "112",
        "nama": "Alat, Bahan, dan Penggandaan dan Penjilidan laporan",
        "kategori": "lainnya"
      },
      {
        "kode": "000113",
        "suffix": "113",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000547",
        "suffix": "547",
        "nama": "Konsumsi",
        "kategori": "lainnya"
      },
      {
        "kode": "000548",
        "suffix": "548",
        "nama": "Kudapan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-003-051.0b-521213",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "003",
    "roNama": "Optimalisasi tata kelola kerja sama penguatan fungsi dan pembangunan strategis di KSA, KPA, dan TB Optimalisasi tata kelola kerja sama penguatan fungsi kawasan konservasi dan konservasi keanekaragaman hayati dan kerja sama pembangunan strategis yang tidak dapat dielakkan",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Rapat Koordinasi Terkait Kerjasama",
    "akunKode": "521213",
    "akunNama": "Belanja Honor Output Kegiatan",
    "klasifikasiMak": "7272.QMA.003.521213",
    "defaultKodeMak": "051.B.114",
    "makPrefix": "051.B",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "003",
      "051.0b",
      "521213"
    ],
    "items": [
      {
        "kode": "000114",
        "suffix": "114",
        "nama": "Ketua",
        "kategori": "lainnya"
      },
      {
        "kode": "000115",
        "suffix": "115",
        "nama": "Sekretaris",
        "kategori": "lainnya"
      },
      {
        "kode": "000116",
        "suffix": "116",
        "nama": "Anggota",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7272-qma-003-051.0b-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7272",
    "kegiatanNama": "Perencanaan Konservasi Keanekaragaman Hayati",
    "kroKode": "QMA",
    "kroNama": "P Kawasan SM Kelian, CA Padang Luwai dan TWA Padang Luwai",
    "roKode": "003",
    "roNama": "Optimalisasi tata kelola kerja sama penguatan fungsi dan pembangunan strategis di KSA, KPA, dan TB Optimalisasi tata kelola kerja sama penguatan fungsi kawasan konservasi dan konservasi keanekaragaman hayati dan kerja sama pembangunan strategis yang tidak dapat dielakkan",
    "komponenKode": "051",
    "komponenNama": "Intervensi Pemeliharaan",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Rapat Koordinasi Terkait Kerjasama",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7272.QMA.003.524111",
    "defaultKodeMak": "051.B.119",
    "makPrefix": "051.B",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7272",
      "qma",
      "003",
      "051.0b",
      "524111"
    ],
    "items": [
      {
        "kode": "000119",
        "suffix": "119",
        "nama": "Perjadin Dalam Rangka Rapat Koordinasi/ Koordinasi dan Konsultasi/ kunjungan lapangan ke Pusat dan Daerah dalam rangka tata kelola",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-cag-001-051.0a-532111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "CAG",
    "kroNama": "Sarana Bidang Pertanian, Kehutanan dan Lingkungan Hidup",
    "roKode": "001",
    "roNama": "Sarana Pengelolaan KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Peralatan Pengelolaan KSA, KPA, dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pengadaan Peralatan Pengendalian Kebakaran Hutan dan Lahan di Seksi KSDA Wilayah I, II, dan III",
    "akunKode": "532111",
    "akunNama": "Belanja Modal Peralatan dan Mesin",
    "klasifikasiMak": "7273.CAG.001.532111",
    "defaultKodeMak": "051.A.818",
    "makPrefix": "051.A",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "cag",
      "001",
      "051.0a",
      "532111"
    ],
    "items": [
      {
        "kode": "000818",
        "suffix": "818",
        "nama": "Mobil Tangki",
        "kategori": "lainnya"
      },
      {
        "kode": "000819",
        "suffix": "819",
        "nama": "Mobil Double Gardan Single Cabin",
        "kategori": "lainnya"
      },
      {
        "kode": "000820",
        "suffix": "820",
        "nama": "Selang",
        "kategori": "lainnya"
      },
      {
        "kode": "000821",
        "suffix": "821",
        "nama": "Pompa Induk",
        "kategori": "lainnya"
      },
      {
        "kode": "000822",
        "suffix": "822",
        "nama": "Drone Thermal",
        "kategori": "lainnya"
      },
      {
        "kode": "000823",
        "suffix": "823",
        "nama": "Pompa Apung",
        "kategori": "lainnya"
      },
      {
        "kode": "000824",
        "suffix": "824",
        "nama": "Drone Fixed Wing VTOL",
        "kategori": "lainnya"
      },
      {
        "kode": "000825",
        "suffix": "825",
        "nama": "Tenda Pleton",
        "kategori": "lainnya"
      },
      {
        "kode": "000826",
        "suffix": "826",
        "nama": "Tanki Air Lipat",
        "kategori": "lainnya"
      },
      {
        "kode": "000827",
        "suffix": "827",
        "nama": "Chainsaw",
        "kategori": "lainnya"
      },
      {
        "kode": "000828",
        "suffix": "828",
        "nama": "Kendaraan roda",
        "kategori": "transport"
      },
      {
        "kode": "000829",
        "suffix": "829",
        "nama": "Perahu Ketinting panjang ketinting",
        "kategori": "transport"
      },
      {
        "kode": "000830",
        "suffix": "830",
        "nama": "Speed boat",
        "kategori": "lainnya"
      },
      {
        "kode": "000831",
        "suffix": "831",
        "nama": "Pompa Punggung/ Jet Shooter",
        "kategori": "lainnya"
      },
      {
        "kode": "000832",
        "suffix": "832",
        "nama": "Nozzle Forestry",
        "kategori": "lainnya"
      },
      {
        "kode": "000833",
        "suffix": "833",
        "nama": "Nozzle Gambut",
        "kategori": "lainnya"
      },
      {
        "kode": "000834",
        "suffix": "834",
        "nama": "Tenda Portable",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-ccg-001-051.0a-521811",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "CCG",
    "kroNama": "OP Sarana Bidang Pertanian, Kehutanan dan Lingkungan Hidup",
    "roKode": "001",
    "roNama": "Operasional Sarana Pengelolaan KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Operasional Peralatan Pengelolaan KSA, KPA, dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Kegiatan Pengendalian Kebakaran Hutan dan Lahan di Seksi KSDA Wilayah I, II, dan III",
    "akunKode": "521811",
    "akunNama": "Belanja Barang Persediaan Barang Konsumsi",
    "klasifikasiMak": "7273.CCG.001.521811",
    "defaultKodeMak": "051.A.839",
    "makPrefix": "051.A",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "ccg",
      "001",
      "051.0a",
      "521811"
    ],
    "items": [
      {
        "kode": "000839",
        "suffix": "839",
        "nama": "Peralatan standar P3K",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-ccg-001-051.0a-523121",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "CCG",
    "kroNama": "OP Sarana Bidang Pertanian, Kehutanan dan Lingkungan Hidup",
    "roKode": "001",
    "roNama": "Operasional Sarana Pengelolaan KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Operasional Peralatan Pengelolaan KSA, KPA, dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Kegiatan Pengendalian Kebakaran Hutan dan Lahan di Seksi KSDA Wilayah I, II, dan III",
    "akunKode": "523121",
    "akunNama": "Belanja Pemeliharaan Peralatan dan Mesin",
    "klasifikasiMak": "7273.CCG.001.523121",
    "defaultKodeMak": "051.A.835",
    "makPrefix": "051.A",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "ccg",
      "001",
      "051.0a",
      "523121"
    ],
    "items": [
      {
        "kode": "000835",
        "suffix": "835",
        "nama": "Operasional peralatan pengendalian kebakaran (bahan bakar, servis, suku cadang)",
        "kategori": "operasional"
      },
      {
        "kode": "000836",
        "suffix": "836",
        "nama": "Operasional dan pemeliharaan kendaraan roda",
        "kategori": "transport"
      },
      {
        "kode": "000837",
        "suffix": "837",
        "nama": "Operasional dan pemeliharaan kendaraan roda",
        "kategori": "transport"
      },
      {
        "kode": "000838",
        "suffix": "838",
        "nama": "Operasional dan pemeliharaan Speed boat/ perahu ketinting",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-pbv-001-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "PBV",
    "kroNama": "Kebijakan Bidang Kehutanan",
    "roKode": "001",
    "roNama": "Rekomendasi Kebijakan Penilaian Efektivitas Pengelolaan Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Penilaian Efektivitas Pengelolaan KSA, KPA, dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "FGD/Rapat Penilaian Efektivitas Pengelolaan Kawasan Konservasi (4 KK CA Teluk Adang, CA Teluk Apar, Tahura Lati Petangis dan Tahura Kubar)",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.PBV.001.521211",
    "defaultKodeMak": "051.A.185",
    "makPrefix": "051.A",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7273",
      "pbv",
      "001",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000185",
        "suffix": "185",
        "nama": "Perlengkapan Peserta",
        "kategori": "lainnya"
      },
      {
        "kode": "000186",
        "suffix": "186",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000187",
        "suffix": "187",
        "nama": "Penggandaan dan Penjilidan laporan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-pbv-001-051.0a-521213",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "PBV",
    "kroNama": "Kebijakan Bidang Kehutanan",
    "roKode": "001",
    "roNama": "Rekomendasi Kebijakan Penilaian Efektivitas Pengelolaan Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Penilaian Efektivitas Pengelolaan KSA, KPA, dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "FGD/Rapat Penilaian Efektivitas Pengelolaan Kawasan Konservasi (4 KK CA Teluk Adang, CA Teluk Apar, Tahura Lati Petangis dan Tahura Kubar)",
    "akunKode": "521213",
    "akunNama": "Belanja Honor Output Kegiatan",
    "klasifikasiMak": "7273.PBV.001.521213",
    "defaultKodeMak": "051.A.188",
    "makPrefix": "051.A",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7273",
      "pbv",
      "001",
      "051.0a",
      "521213"
    ],
    "items": [
      {
        "kode": "000188",
        "suffix": "188",
        "nama": "Ketua",
        "kategori": "lainnya"
      },
      {
        "kode": "000189",
        "suffix": "189",
        "nama": "Sekretaris",
        "kategori": "lainnya"
      },
      {
        "kode": "000190",
        "suffix": "190",
        "nama": "Anggota",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-pbv-001-051.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "PBV",
    "kroNama": "Kebijakan Bidang Kehutanan",
    "roKode": "001",
    "roNama": "Rekomendasi Kebijakan Penilaian Efektivitas Pengelolaan Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Penilaian Efektivitas Pengelolaan KSA, KPA, dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "FGD/Rapat Penilaian Efektivitas Pengelolaan Kawasan Konservasi (4 KK CA Teluk Adang, CA Teluk Apar, Tahura Lati Petangis dan Tahura Kubar)",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.PBV.001.524111",
    "defaultKodeMak": "051.A.192",
    "makPrefix": "051.A",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7273",
      "pbv",
      "001",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000192",
        "suffix": "192",
        "nama": "Perjadin Fasilitator Penilaian Efektivitas Pengelolaan Kawasan Konservasi",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-pbv-001-051.0a-524114",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "PBV",
    "kroNama": "Kebijakan Bidang Kehutanan",
    "roKode": "001",
    "roNama": "Rekomendasi Kebijakan Penilaian Efektivitas Pengelolaan Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Penilaian Efektivitas Pengelolaan KSA, KPA, dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "FGD/Rapat Penilaian Efektivitas Pengelolaan Kawasan Konservasi (4 KK CA Teluk Adang, CA Teluk Apar, Tahura Lati Petangis dan Tahura Kubar)",
    "akunKode": "524114",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Dalam Kota",
    "klasifikasiMak": "7273.PBV.001.524114",
    "defaultKodeMak": "051.A.195",
    "makPrefix": "051.A",
    "kategoriGrup": "perencanaan",
    "keywords": [
      "7273",
      "pbv",
      "001",
      "051.0a",
      "524114"
    ],
    "items": [
      {
        "kode": "000195",
        "suffix": "195",
        "nama": "Paket Meeting Fullboard",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembentukan Kader Konservasi di Samarinda",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.QDC.001.521211",
    "defaultKodeMak": "051.A.197",
    "makPrefix": "051.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000197",
        "suffix": "197",
        "nama": "Perlengkapan Peserta",
        "kategori": "lainnya"
      },
      {
        "kode": "000198",
        "suffix": "198",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000199",
        "suffix": "199",
        "nama": "Konsumsi dan Kudapan",
        "kategori": "lainnya"
      },
      {
        "kode": "000200",
        "suffix": "200",
        "nama": "Penggandaan dan Penjilidan laporan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0a-521213",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembentukan Kader Konservasi di Samarinda",
    "akunKode": "521213",
    "akunNama": "Belanja Honor Output Kegiatan",
    "klasifikasiMak": "7273.QDC.001.521213",
    "defaultKodeMak": "051.A.201",
    "makPrefix": "051.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0a",
      "521213"
    ],
    "items": [
      {
        "kode": "000201",
        "suffix": "201",
        "nama": "Ketua",
        "kategori": "lainnya"
      },
      {
        "kode": "000202",
        "suffix": "202",
        "nama": "Sekretaris",
        "kategori": "lainnya"
      },
      {
        "kode": "000203",
        "suffix": "203",
        "nama": "Anggota",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0a-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembentukan Kader Konservasi di Samarinda",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7273.QDC.001.521219",
    "defaultKodeMak": "051.A.579",
    "makPrefix": "051.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0a",
      "521219"
    ],
    "items": [
      {
        "kode": "000579",
        "suffix": "579",
        "nama": "Operasional Petugas Pelaksana",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0a-522141",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembentukan Kader Konservasi di Samarinda",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7273.QDC.001.522141",
    "defaultKodeMak": "051.A.205",
    "makPrefix": "051.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0a",
      "522141"
    ],
    "items": [
      {
        "kode": "000205",
        "suffix": "205",
        "nama": "Sewa Kendaraan",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0a-522151",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembentukan Kader Konservasi di Samarinda",
    "akunKode": "522151",
    "akunNama": "Belanja Jasa Profesi",
    "klasifikasiMak": "7273.QDC.001.522151",
    "defaultKodeMak": "051.A.206",
    "makPrefix": "051.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0a",
      "522151"
    ],
    "items": [
      {
        "kode": "000206",
        "suffix": "206",
        "nama": "Honor Narasumber/ Pembicara",
        "kategori": "honor"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0a-524114",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembentukan Kader Konservasi di Samarinda",
    "akunKode": "524114",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Dalam Kota",
    "klasifikasiMak": "7273.QDC.001.524114",
    "defaultKodeMak": "051.A.208",
    "makPrefix": "051.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0a",
      "524114"
    ],
    "items": [
      {
        "kode": "000208",
        "suffix": "208",
        "nama": "Bantuan Transport Peserta",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0b-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembinaan Kelompok Pencinta Alam",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.QDC.001.521211",
    "defaultKodeMak": "051.B.209",
    "makPrefix": "051.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0b",
      "521211"
    ],
    "items": [
      {
        "kode": "000209",
        "suffix": "209",
        "nama": "Perlengkapan Peserta",
        "kategori": "lainnya"
      },
      {
        "kode": "000210",
        "suffix": "210",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000211",
        "suffix": "211",
        "nama": "Konsumsi dan Kudapan",
        "kategori": "lainnya"
      },
      {
        "kode": "000212",
        "suffix": "212",
        "nama": "Penggandaan dan Penjilidan laporan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0b-521213",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembinaan Kelompok Pencinta Alam",
    "akunKode": "521213",
    "akunNama": "Belanja Honor Output Kegiatan",
    "klasifikasiMak": "7273.QDC.001.521213",
    "defaultKodeMak": "051.B.213",
    "makPrefix": "051.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0b",
      "521213"
    ],
    "items": [
      {
        "kode": "000213",
        "suffix": "213",
        "nama": "Ketua",
        "kategori": "lainnya"
      },
      {
        "kode": "000214",
        "suffix": "214",
        "nama": "Sekretaris",
        "kategori": "lainnya"
      },
      {
        "kode": "000215",
        "suffix": "215",
        "nama": "Anggota",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0b-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembinaan Kelompok Pencinta Alam",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7273.QDC.001.521219",
    "defaultKodeMak": "051.B.580",
    "makPrefix": "051.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0b",
      "521219"
    ],
    "items": [
      {
        "kode": "000580",
        "suffix": "580",
        "nama": "Operasional Petugas Pelaksana",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0b-522141",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembinaan Kelompok Pencinta Alam",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7273.QDC.001.522141",
    "defaultKodeMak": "051.B.216",
    "makPrefix": "051.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0b",
      "522141"
    ],
    "items": [
      {
        "kode": "000216",
        "suffix": "216",
        "nama": "Sewa Ruangan",
        "kategori": "transport"
      },
      {
        "kode": "000217",
        "suffix": "217",
        "nama": "Sewa Kendaraan",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0b-522151",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembinaan Kelompok Pencinta Alam",
    "akunKode": "522151",
    "akunNama": "Belanja Jasa Profesi",
    "klasifikasiMak": "7273.QDC.001.522151",
    "defaultKodeMak": "051.B.218",
    "makPrefix": "051.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0b",
      "522151"
    ],
    "items": [
      {
        "kode": "000218",
        "suffix": "218",
        "nama": "Honor Narasumber/ Pembicara",
        "kategori": "honor"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0b-524114",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembinaan Kelompok Pencinta Alam",
    "akunKode": "524114",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Dalam Kota",
    "klasifikasiMak": "7273.QDC.001.524114",
    "defaultKodeMak": "051.B.219",
    "makPrefix": "051.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0b",
      "524114"
    ],
    "items": [
      {
        "kode": "000219",
        "suffix": "219",
        "nama": "Bantuan Transport Peserta",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0c-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Koordinasi dan Konsultasi Ke Pusat dan Daerah",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.QDC.001.524111",
    "defaultKodeMak": "051.C.222",
    "makPrefix": "051.C",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0c",
      "524111"
    ],
    "items": [
      {
        "kode": "000222",
        "suffix": "222",
        "nama": "Perjadin Koordinasi dan Konsultasi Ke Pusat dan Daerah",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0d-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Kampanye BCA/ Visit to School",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.QDC.001.521211",
    "defaultKodeMak": "051.D.223",
    "makPrefix": "051.D",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0d",
      "521211"
    ],
    "items": [
      {
        "kode": "000223",
        "suffix": "223",
        "nama": "Perlengkapan Peserta",
        "kategori": "lainnya"
      },
      {
        "kode": "000224",
        "suffix": "224",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000225",
        "suffix": "225",
        "nama": "Kudapan",
        "kategori": "lainnya"
      },
      {
        "kode": "000226",
        "suffix": "226",
        "nama": "Penggandaan dan Penjilidan laporan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-qdc-001-051.0d-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDC",
    "kroNama": "Fasilitasi dan Pembinaan Masyarakat",
    "roKode": "001",
    "roNama": "Masyarakat yang dilibatkan dalam Kegiatan Konservasi Kawasan dan Keanekaragaman Hayati",
    "komponenKode": "051",
    "komponenNama": "Fasilitasi masyarakat dalam kegiatan pengelolaan Konservasi Kawasan dan Keanekaragaman Hayati",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Kampanye BCA/ Visit to School",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7273.QDC.001.521219",
    "defaultKodeMak": "051.D.577",
    "makPrefix": "051.D",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdc",
      "001",
      "051.0d",
      "521219"
    ],
    "items": [
      {
        "kode": "000577",
        "suffix": "577",
        "nama": "Operasional Petugas Pelaksana",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "051",
    "komponenNama": "Pengembangan Kelembagaan dalam rangka Pemberdayaan Masayarakat",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Fasilitasi Pembentukan kelompok di Kasai dan Kampung Tutung)",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.QDD.001.521211",
    "defaultKodeMak": "051.A.230",
    "makPrefix": "051.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000230",
        "suffix": "230",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000231",
        "suffix": "231",
        "nama": "Konsumsi dan Kudapan pertemuan kelompok",
        "kategori": "lainnya"
      },
      {
        "kode": "000232",
        "suffix": "232",
        "nama": "Penggandaan dan Penjilidan Laporan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-051.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "051",
    "komponenNama": "Pengembangan Kelembagaan dalam rangka Pemberdayaan Masayarakat",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Fasilitasi Pembentukan kelompok di Kasai dan Kampung Tutung)",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.QDD.001.524111",
    "defaultKodeMak": "051.A.233",
    "makPrefix": "051.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000233",
        "suffix": "233",
        "nama": "Perjadin dalam rangka Pembentukan",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-051.0a-524119",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "051",
    "komponenNama": "Pengembangan Kelembagaan dalam rangka Pemberdayaan Masayarakat",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Fasilitasi Pembentukan kelompok di Kasai dan Kampung Tutung)",
    "akunKode": "524119",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Luar Kota",
    "klasifikasiMak": "7273.QDD.001.524119",
    "defaultKodeMak": "051.A.234",
    "makPrefix": "051.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "051.0a",
      "524119"
    ],
    "items": [
      {
        "kode": "000234",
        "suffix": "234",
        "nama": "Bantuan Transport peserta",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-052.0b-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "052",
    "komponenNama": "Fasilitasi Pendampingan Masyarakat dalam rangka Pemberdayaan Masyarakat",
    "subkomponenKode": "052.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Fasilitasi Penyusunan rencana kelompok di Harapan, Desa Kasai dan Kampung Tutung)",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.QDD.001.521211",
    "defaultKodeMak": "052.B.238",
    "makPrefix": "052.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "052.0b",
      "521211"
    ],
    "items": [
      {
        "kode": "000238",
        "suffix": "238",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000239",
        "suffix": "239",
        "nama": "Konsumsi dan Kudapan pertemuan kelompok",
        "kategori": "lainnya"
      },
      {
        "kode": "000240",
        "suffix": "240",
        "nama": "Penggandaan dan Penjilidan Laporan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-052.0b-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "052",
    "komponenNama": "Fasilitasi Pendampingan Masyarakat dalam rangka Pemberdayaan Masyarakat",
    "subkomponenKode": "052.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Fasilitasi Penyusunan rencana kelompok di Harapan, Desa Kasai dan Kampung Tutung)",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.QDD.001.524111",
    "defaultKodeMak": "052.B.241",
    "makPrefix": "052.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "052.0b",
      "524111"
    ],
    "items": [
      {
        "kode": "000241",
        "suffix": "241",
        "nama": "Perjadin dalam rangka Penyusunan Rencana Kelompok",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-052.0b-524119",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "052",
    "komponenNama": "Fasilitasi Pendampingan Masyarakat dalam rangka Pemberdayaan Masyarakat",
    "subkomponenKode": "052.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Fasilitasi Penyusunan rencana kelompok di Harapan, Desa Kasai dan Kampung Tutung)",
    "akunKode": "524119",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Luar Kota",
    "klasifikasiMak": "7273.QDD.001.524119",
    "defaultKodeMak": "052.B.242",
    "makPrefix": "052.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "052.0b",
      "524119"
    ],
    "items": [
      {
        "kode": "000242",
        "suffix": "242",
        "nama": "Bantuan Transport peserta",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-052.0c-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "052",
    "komponenNama": "Fasilitasi Pendampingan Masyarakat dalam rangka Pemberdayaan Masyarakat",
    "subkomponenKode": "052.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Bimtek, Koordinasi, dan Konsultasi ke Pusat",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.QDD.001.524111",
    "defaultKodeMak": "052.C.243",
    "makPrefix": "052.C",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "052.0c",
      "524111"
    ],
    "items": [
      {
        "kode": "000243",
        "suffix": "243",
        "nama": "Perjadin dalam rangka Bimtek, Koordinasi, dan Konsultasi ke Pusat",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-053.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "053",
    "komponenNama": "Bantuan Usaha Ekonomi Produktif Kelompok Masyarakat",
    "subkomponenKode": "053.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pemberian bantuan usaha ekonomi produktif di Harapan, Desa Kasai dan Kampung Tutung)",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.QDD.001.521211",
    "defaultKodeMak": "053.A.244",
    "makPrefix": "053.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "053.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000244",
        "suffix": "244",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000245",
        "suffix": "245",
        "nama": "Konsumsi dan Kudapan pertemuan kelompok",
        "kategori": "lainnya"
      },
      {
        "kode": "000246",
        "suffix": "246",
        "nama": "Penggandaan dan Penjilidan Laporan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-053.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "053",
    "komponenNama": "Bantuan Usaha Ekonomi Produktif Kelompok Masyarakat",
    "subkomponenKode": "053.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pemberian bantuan usaha ekonomi produktif di Harapan, Desa Kasai dan Kampung Tutung)",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.QDD.001.524111",
    "defaultKodeMak": "053.A.247",
    "makPrefix": "053.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "053.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000247",
        "suffix": "247",
        "nama": "Perjadin dalam rangka Pemberian bantuan usaha ekonomi produktif",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-053.0a-526312",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "053",
    "komponenNama": "Bantuan Usaha Ekonomi Produktif Kelompok Masyarakat",
    "subkomponenKode": "053.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pemberian bantuan usaha ekonomi produktif di Harapan, Desa Kasai dan Kampung Tutung)",
    "akunKode": "526312",
    "akunNama": "Belanja Barang untuk Bantuan Lainnya yang Memiliki Karakteristik",
    "klasifikasiMak": "7273.QDD.001.526312",
    "defaultKodeMak": "053.A.248",
    "makPrefix": "053.A",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "053.0a",
      "526312"
    ],
    "items": [
      {
        "kode": "000248",
        "suffix": "248",
        "nama": "Bantuan Pengembangan/Peningkatan Usaha Ekonomi Kelompok",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-053.0b-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "053",
    "komponenNama": "Bantuan Usaha Ekonomi Produktif Kelompok Masyarakat",
    "subkomponenKode": "053.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Peningkatan kapasitas masyarakat",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.QDD.001.521211",
    "defaultKodeMak": "053.B.249",
    "makPrefix": "053.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "053.0b",
      "521211"
    ],
    "items": [
      {
        "kode": "000249",
        "suffix": "249",
        "nama": "Perlengkapan Peserta",
        "kategori": "lainnya"
      },
      {
        "kode": "000250",
        "suffix": "250",
        "nama": "Spanduk",
        "kategori": "lainnya"
      },
      {
        "kode": "000251",
        "suffix": "251",
        "nama": "Konsumsi dan Kudapan pertemuan kelompok",
        "kategori": "lainnya"
      },
      {
        "kode": "000252",
        "suffix": "252",
        "nama": "Penggandaan dan Penjilidan Laporan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-053.0b-522151",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "053",
    "komponenNama": "Bantuan Usaha Ekonomi Produktif Kelompok Masyarakat",
    "subkomponenKode": "053.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Peningkatan kapasitas masyarakat",
    "akunKode": "522151",
    "akunNama": "Belanja Jasa Profesi",
    "klasifikasiMak": "7273.QDD.001.522151",
    "defaultKodeMak": "053.B.253",
    "makPrefix": "053.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "053.0b",
      "522151"
    ],
    "items": [
      {
        "kode": "000253",
        "suffix": "253",
        "nama": "Honor Narasumber",
        "kategori": "honor"
      },
      {
        "kode": "000254",
        "suffix": "254",
        "nama": "Honor Moderator",
        "kategori": "honor"
      },
      {
        "kode": "000628",
        "suffix": "628",
        "nama": "Honor Narasumber",
        "kategori": "honor"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-053.0b-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "053",
    "komponenNama": "Bantuan Usaha Ekonomi Produktif Kelompok Masyarakat",
    "subkomponenKode": "053.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Peningkatan kapasitas masyarakat",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.QDD.001.524111",
    "defaultKodeMak": "053.B.255",
    "makPrefix": "053.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "053.0b",
      "524111"
    ],
    "items": [
      {
        "kode": "000255",
        "suffix": "255",
        "nama": "Perjadin dalam rangka Peningkatan kapasitas masyarakat",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-qdd-001-053.0b-524119",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "QDD",
    "kroNama": "Fasilitasi dan Pembinaan Kelompok Masyarakat",
    "roKode": "001",
    "roNama": "Pembinaan dan Pemberdayaan Kelompok Masyarakat",
    "komponenKode": "053",
    "komponenNama": "Bantuan Usaha Ekonomi Produktif Kelompok Masyarakat",
    "subkomponenKode": "053.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Peningkatan kapasitas masyarakat",
    "akunKode": "524119",
    "akunNama": "Belanja Perjalanan Dinas Paket Meeting Luar Kota",
    "klasifikasiMak": "7273.QDD.001.524119",
    "defaultKodeMak": "053.B.257",
    "makPrefix": "053.B",
    "kategoriGrup": "masyarakat",
    "keywords": [
      "7273",
      "qdd",
      "001",
      "053.0b",
      "524119"
    ],
    "items": [
      {
        "kode": "000257",
        "suffix": "257",
        "nama": "Bantuan Transport peserta",
        "kategori": "transport"
      },
      {
        "kode": "000258",
        "suffix": "258",
        "nama": "Bantuan Transport Narasumber",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-001-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Inventarisasi dan Verifikasi Usaha dan/atau Kegiatan Terbangun di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Inventarisasi dan Verifikasi Subjek dan Objek Usaha dan/atau Kegiatan Terbangun di KSA, KPA dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Sosialisasi dan Identifikasi kawasan terbangun di Kawasan Konservasi (CA Muara Kaman Sedulang)",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.REA.001.521211",
    "defaultKodeMak": "051.A.259",
    "makPrefix": "051.A",
    "kategoriGrup": "umum",
    "keywords": [
      "7273",
      "rea",
      "001",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000259",
        "suffix": "259",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000260",
        "suffix": "260",
        "nama": "Obat-obatan",
        "kategori": "lainnya"
      },
      {
        "kode": "000261",
        "suffix": "261",
        "nama": "Penggandaan Peta Kerja",
        "kategori": "lainnya"
      },
      {
        "kode": "000262",
        "suffix": "262",
        "nama": "Penggandaan Peta Hasil",
        "kategori": "lainnya"
      },
      {
        "kode": "000263",
        "suffix": "263",
        "nama": "Penggandaan dan Penjilidan",
        "kategori": "lainnya"
      },
      {
        "kode": "000264",
        "suffix": "264",
        "nama": "Bahan Makan Buruh",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-001-051.0a-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Inventarisasi dan Verifikasi Usaha dan/atau Kegiatan Terbangun di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Inventarisasi dan Verifikasi Subjek dan Objek Usaha dan/atau Kegiatan Terbangun di KSA, KPA dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Sosialisasi dan Identifikasi kawasan terbangun di Kawasan Konservasi (CA Muara Kaman Sedulang)",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7273.REA.001.521219",
    "defaultKodeMak": "051.A.265",
    "makPrefix": "051.A",
    "kategoriGrup": "umum",
    "keywords": [
      "7273",
      "rea",
      "001",
      "051.0a",
      "521219"
    ],
    "items": [
      {
        "kode": "000265",
        "suffix": "265",
        "nama": "Upah Buruh",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-001-051.0a-522141",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Inventarisasi dan Verifikasi Usaha dan/atau Kegiatan Terbangun di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Inventarisasi dan Verifikasi Subjek dan Objek Usaha dan/atau Kegiatan Terbangun di KSA, KPA dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Sosialisasi dan Identifikasi kawasan terbangun di Kawasan Konservasi (CA Muara Kaman Sedulang)",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7273.REA.001.522141",
    "defaultKodeMak": "051.A.266",
    "makPrefix": "051.A",
    "kategoriGrup": "umum",
    "keywords": [
      "7273",
      "rea",
      "001",
      "051.0a",
      "522141"
    ],
    "items": [
      {
        "kode": "000266",
        "suffix": "266",
        "nama": "Sewa kendaraan air",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-001-051.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "001",
    "roNama": "Inventarisasi dan Verifikasi Usaha dan/atau Kegiatan Terbangun di KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Inventarisasi dan Verifikasi Subjek dan Objek Usaha dan/atau Kegiatan Terbangun di KSA, KPA dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Sosialisasi dan Identifikasi kawasan terbangun di Kawasan Konservasi (CA Muara Kaman Sedulang)",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.REA.001.524111",
    "defaultKodeMak": "051.A.627",
    "makPrefix": "051.A",
    "kategoriGrup": "umum",
    "keywords": [
      "7273",
      "rea",
      "001",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000627",
        "suffix": "627",
        "nama": "Uang Harian Petugas",
        "kategori": "uang_harian"
      },
      {
        "kode": "000792",
        "suffix": "792",
        "nama": "Penginapan petugas",
        "kategori": "penginapan"
      },
      {
        "kode": "000793",
        "suffix": "793",
        "nama": "Transportasi Darat",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-002-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Perlindungan dan Pengamanan KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Smart Patrol di KSA, KPA dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Smart Patrol di Kawasan Konservasi (Petugas UPT bersama MMP)",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.REA.002.521211",
    "defaultKodeMak": "051.A.287",
    "makPrefix": "051.A",
    "kategoriGrup": "patroli",
    "keywords": [
      "7273",
      "rea",
      "002",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000287",
        "suffix": "287",
        "nama": "Pemelliharaan Speedboat/longboat, BBM Oli Untuk Patroli di TWA. Pulau Sangalaki dan SM P. Semama",
        "kategori": "transport"
      },
      {
        "kode": "000288",
        "suffix": "288",
        "nama": "Perlengkapan Lapangan di TWA. Pulau Sangalaki dan SM P. Semama",
        "kategori": "lainnya"
      },
      {
        "kode": "000564",
        "suffix": "564",
        "nama": "Pemelliharaan Speedboat/longboat, BBM Oli Untuk Patroli di TWA. Pulau Sangalaki dan SM P. Semama",
        "kategori": "transport"
      },
      {
        "kode": "000565",
        "suffix": "565",
        "nama": "Perlengkapan Lapangan di TWA. Pulau Sangalaki dan SM P. Semama",
        "kategori": "lainnya"
      },
      {
        "kode": "000566",
        "suffix": "566",
        "nama": "Penjilidan Laporan Smart Patrol di TWA. Pulau Sangalaki dan SM P. Semama",
        "kategori": "lainnya"
      },
      {
        "kode": "000567",
        "suffix": "567",
        "nama": "Bahan Bakar Minyak Untuk Patroli di CA. Muara Kaman",
        "kategori": "operasional"
      },
      {
        "kode": "000568",
        "suffix": "568",
        "nama": "Perlengkapan Lapangan di Resort CA. Muara Kaman Sedulang",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-002-051.0a-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Perlindungan dan Pengamanan KSA, KPA, dan TB",
    "komponenKode": "051",
    "komponenNama": "Smart Patrol di KSA, KPA dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Smart Patrol di Kawasan Konservasi (Petugas UPT bersama MMP)",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7273.REA.002.521219",
    "defaultKodeMak": "051.A.292",
    "makPrefix": "051.A",
    "kategoriGrup": "patroli",
    "keywords": [
      "7273",
      "rea",
      "002",
      "051.0a",
      "521219"
    ],
    "items": [
      {
        "kode": "000292",
        "suffix": "292",
        "nama": "Biaya Operasional Petugas Pengamanan Hutan di Resort Sangalaki Semama",
        "kategori": "operasional"
      },
      {
        "kode": "000293",
        "suffix": "293",
        "nama": "Biaya Operasional Petugas Pengamanan Hutan di Resort CA Padang Luway",
        "kategori": "operasional"
      },
      {
        "kode": "000294",
        "suffix": "294",
        "nama": "Upah Harian dan Uang Makan MMP di Resort CA Padang Luway",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-002-053.0a-533121",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Perlindungan dan Pengamanan KSA, KPA, dan TB",
    "komponenKode": "053",
    "komponenNama": "Penguatan Resor",
    "subkomponenKode": "053.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pemeliharaan Pondok Kerja Resor CA Padang Luway dan SM Pulau Semama",
    "akunKode": "533121",
    "akunNama": "Belanja Penambahan Nilai Gedung dan Bangunan",
    "klasifikasiMak": "7273.REA.002.533121",
    "defaultKodeMak": "053.A.312",
    "makPrefix": "053.A",
    "kategoriGrup": "patroli",
    "keywords": [
      "7273",
      "rea",
      "002",
      "053.0a",
      "533121"
    ],
    "items": [
      {
        "kode": "000312",
        "suffix": "312",
        "nama": "Pemeliharaan gedung dan bangunan serta pagar/halaman Pondok Kerja Resor CA Padang Luwai",
        "kategori": "lainnya"
      },
      {
        "kode": "000313",
        "suffix": "313",
        "nama": "Pemeliharaan gedung dan bangunan serta pagar/halaman Pondok Kerja Resor CA Padang Luwai",
        "kategori": "lainnya"
      },
      {
        "kode": "000552",
        "suffix": "552",
        "nama": "Pemeliharaan gedung dan bangunan serta pagar/halaman Pondok Kerja Resor Resort SM Pulau Semama",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-002-053.0b-521811",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "002",
    "roNama": "Perlindungan dan Pengamanan KSA, KPA, dan TB",
    "komponenKode": "053",
    "komponenNama": "Penguatan Resor",
    "subkomponenKode": "053.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pencetakan karcis Pengunjung Kawasan TWA. Pulau Sangalaki",
    "akunKode": "521811",
    "akunNama": "Belanja Barang Persediaan Barang Konsumsi",
    "klasifikasiMak": "7273.REA.002.521811",
    "defaultKodeMak": "053.B.550",
    "makPrefix": "053.B",
    "kategoriGrup": "patroli",
    "keywords": [
      "7273",
      "rea",
      "002",
      "053.0b",
      "521811"
    ],
    "items": [
      {
        "kode": "000550",
        "suffix": "550",
        "nama": "Pencetakan karcis masuk pengunjung kawasan TWA. Pulau Sangalaki",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0a-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Patroli Pencegahan Kebakaran Hutan (Terrestrial), Penyadartahuan, Groundcheck Hotspot atau Informasi Kebakaran, dan Pemadaman Kebakaran Hutan dan Lahan",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.REA.003.521211",
    "defaultKodeMak": "051.A.270",
    "makPrefix": "051.A",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0a",
      "521211"
    ],
    "items": [
      {
        "kode": "000270",
        "suffix": "270",
        "nama": "ATK dan Perlengkapan lapangan",
        "kategori": "lainnya"
      },
      {
        "kode": "000271",
        "suffix": "271",
        "nama": "Pengandaan dan Penjilidan Laporan",
        "kategori": "lainnya"
      },
      {
        "kode": "000273",
        "suffix": "273",
        "nama": "Konsumsi dan Kudapan pertemuan kelompok",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0a-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Patroli Pencegahan Kebakaran Hutan (Terrestrial), Penyadartahuan, Groundcheck Hotspot atau Informasi Kebakaran, dan Pemadaman Kebakaran Hutan dan Lahan",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7273.REA.003.521219",
    "defaultKodeMak": "051.A.276",
    "makPrefix": "051.A",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0a",
      "521219"
    ],
    "items": [
      {
        "kode": "000276",
        "suffix": "276",
        "nama": "Operasional petugas dalam rangka penanganan Karhutla (Sosialisasi/ Penyadartahuan, Pencegahan, Pemadaman, Groundcek Hotspot, Pengu",
        "kategori": "operasional"
      },
      {
        "kode": "000277",
        "suffix": "277",
        "nama": "Operasional pendukung dalam rangka Penanganan Karhutla (BBM, Alat dan Bahan Pemadaman, Transportasi dll)",
        "kategori": "operasional"
      },
      {
        "kode": "000278",
        "suffix": "278",
        "nama": "Upah Buruh",
        "kategori": "uang_harian"
      },
      {
        "kode": "000553",
        "suffix": "553",
        "nama": "Biaya Operasional Petugas Pengamanan Hutan dan Patroli Pencegahan Kebakaran Hutan di Resort CA Muara Kaman",
        "kategori": "operasional"
      },
      {
        "kode": "000554",
        "suffix": "554",
        "nama": "Upah Harian dan Uang Makan MMP di Resort CA Muara Kaman",
        "kategori": "uang_harian"
      },
      {
        "kode": "000629",
        "suffix": "629",
        "nama": "Bahan Bakar Minyak Untuk Patroli di CA. Muara Kaman",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0a-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Patroli Pencegahan Kebakaran Hutan (Terrestrial), Penyadartahuan, Groundcheck Hotspot atau Informasi Kebakaran, dan Pemadaman Kebakaran Hutan dan Lahan",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.REA.003.524111",
    "defaultKodeMak": "051.A.279",
    "makPrefix": "051.A",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000279",
        "suffix": "279",
        "nama": "Koordinasi dan Konsultasi",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0a-532111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Patroli Pencegahan Kebakaran Hutan (Terrestrial), Penyadartahuan, Groundcheck Hotspot atau Informasi Kebakaran, dan Pemadaman Kebakaran Hutan dan Lahan",
    "akunKode": "532111",
    "akunNama": "Belanja Modal Peralatan dan Mesin",
    "klasifikasiMak": "7273.REA.003.532111",
    "defaultKodeMak": "051.A.280",
    "makPrefix": "051.A",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0a",
      "532111"
    ],
    "items": [
      {
        "kode": "000280",
        "suffix": "280",
        "nama": "Jet Shooter (Pompa Punggung",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0b-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Identifikasi Sumber Daya Pemadaman di kawasan CA Muara Kaman dan CA Padang Luway terkait pengendalian kebakaran hutan",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.REA.003.521211",
    "defaultKodeMak": "051.B.281",
    "makPrefix": "051.B",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0b",
      "521211"
    ],
    "items": [
      {
        "kode": "000281",
        "suffix": "281",
        "nama": "Alat dan Bahan",
        "kategori": "lainnya"
      },
      {
        "kode": "000282",
        "suffix": "282",
        "nama": "Pengandaan dan Penjilidan Laporan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0b-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Identifikasi Sumber Daya Pemadaman di kawasan CA Muara Kaman dan CA Padang Luway terkait pengendalian kebakaran hutan",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7273.REA.003.521219",
    "defaultKodeMak": "051.B.284",
    "makPrefix": "051.B",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0b",
      "521219"
    ],
    "items": [
      {
        "kode": "000284",
        "suffix": "284",
        "nama": "Operasional petugas dalam rangka identifikasi Sumber- sumber Daya Pemadaman hutan",
        "kategori": "operasional"
      },
      {
        "kode": "000285",
        "suffix": "285",
        "nama": "Upah Buruh",
        "kategori": "uang_harian"
      },
      {
        "kode": "000286",
        "suffix": "286",
        "nama": "Transportasi Darat",
        "kategori": "transport"
      },
      {
        "kode": "000578",
        "suffix": "578",
        "nama": "Transportasi Air",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0c-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Patroli Pencegahan Kebakaran Hutan (Terrestrial), Penyadartahuan, Groundcheck Hotspot atau Informasi Kebakaran, dan Pemadaman Kebakaran Hutan dan Lahan (PNBP PKH)",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7273.REA.003.521219",
    "defaultKodeMak": "051.C.610",
    "makPrefix": "051.C",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0c",
      "521219"
    ],
    "items": [
      {
        "kode": "000610",
        "suffix": "610",
        "nama": "Operasional petugas dalam rangka penanganan Karhutla (Sosialisasi/ Penyadartahuan, Pencegahan, Pemadaman, Groundcek Hotspot, Pengu",
        "kategori": "operasional"
      },
      {
        "kode": "000611",
        "suffix": "611",
        "nama": "Operasional pendukung dalam rangka Penanganan Karhutla (BBM, Alat dan Bahan Pemadaman, Transportasi dll)",
        "kategori": "operasional"
      },
      {
        "kode": "000612",
        "suffix": "612",
        "nama": "Upah Buruh",
        "kategori": "uang_harian"
      },
      {
        "kode": "000613",
        "suffix": "613",
        "nama": "Operasional Petugas Pengamanan di TWA Pulau Sangalaki",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0c-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Patroli Pencegahan Kebakaran Hutan (Terrestrial), Penyadartahuan, Groundcheck Hotspot atau Informasi Kebakaran, dan Pemadaman Kebakaran Hutan dan Lahan (PNBP PKH)",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.REA.003.524111",
    "defaultKodeMak": "051.C.615",
    "makPrefix": "051.C",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0c",
      "524111"
    ],
    "items": [
      {
        "kode": "000615",
        "suffix": "615",
        "nama": "Koordinasi dan Konsultasi",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0d-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Pembuatan Sekat Bakar (PNBP PKH)",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.REA.003.521211",
    "defaultKodeMak": "051.D.617",
    "makPrefix": "051.D",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0d",
      "521211"
    ],
    "items": [
      {
        "kode": "000617",
        "suffix": "617",
        "nama": "Penggandaan dan penjilidan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0d-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Pembuatan Sekat Bakar (PNBP PKH)",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7273.REA.003.521219",
    "defaultKodeMak": "051.D.618",
    "makPrefix": "051.D",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0d",
      "521219"
    ],
    "items": [
      {
        "kode": "000618",
        "suffix": "618",
        "nama": "Upah Buruh",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0d-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Pembuatan Sekat Bakar (PNBP PKH)",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.REA.003.524111",
    "defaultKodeMak": "051.D.619",
    "makPrefix": "051.D",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0d",
      "524111"
    ],
    "items": [
      {
        "kode": "000619",
        "suffix": "619",
        "nama": "Operasional petugas dalam rangka Pembuatan Sekat Bakar",
        "kategori": "operasional"
      },
      {
        "kode": "000620",
        "suffix": "620",
        "nama": "Transportasi Petugas",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0e-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0E",
    "subkomponenLetter": "E",
    "subkomponenNama": "Patroli Pencegahan Karhutla, Penyadartahuan, dan Pemadaman Karhutla bersama Masyarakat dan Stakeholder Lainnya di Kab. Kutai Kartanegara, Kab. Kutai Barat, Kab. Kutai Timur dan Kab. Paser (BB)",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.REA.003.521211",
    "defaultKodeMak": "051.E.765",
    "makPrefix": "051.E",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0e",
      "521211"
    ],
    "items": [
      {
        "kode": "000765",
        "suffix": "765",
        "nama": "Bahan logistik habis pakai: konsumsi lapangan, alat dan bahan pemadaman, spanduk, dokumentasi",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0e-521219",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0E",
    "subkomponenLetter": "E",
    "subkomponenNama": "Patroli Pencegahan Karhutla, Penyadartahuan, dan Pemadaman Karhutla bersama Masyarakat dan Stakeholder Lainnya di Kab. Kutai Kartanegara, Kab. Kutai Barat, Kab. Kutai Timur dan Kab. Paser (BB)",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7273.REA.003.521219",
    "defaultKodeMak": "051.E.766",
    "makPrefix": "051.E",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0e",
      "521219"
    ],
    "items": [
      {
        "kode": "000766",
        "suffix": "766",
        "nama": "Operasional petugas dalam rangka penanganan Karhutla (Sosialisasi/ Penyadartahuan, Pencegahan, Pemadaman, Groundcek Hotspot, Pengu",
        "kategori": "operasional"
      },
      {
        "kode": "000767",
        "suffix": "767",
        "nama": "Operasional pendukung dalam rangka Penanganan Karhutla (BBM, Alat dan Bahan Pemadaman, Transportasi dll)",
        "kategori": "operasional"
      },
      {
        "kode": "000768",
        "suffix": "768",
        "nama": "Upah Buruh",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0e-522141",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0E",
    "subkomponenLetter": "E",
    "subkomponenNama": "Patroli Pencegahan Karhutla, Penyadartahuan, dan Pemadaman Karhutla bersama Masyarakat dan Stakeholder Lainnya di Kab. Kutai Kartanegara, Kab. Kutai Barat, Kab. Kutai Timur dan Kab. Paser (BB)",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7273.REA.003.522141",
    "defaultKodeMak": "051.E.769",
    "makPrefix": "051.E",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0e",
      "522141"
    ],
    "items": [
      {
        "kode": "000769",
        "suffix": "769",
        "nama": "Sewa Kendaraan Air",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0e-524111",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0E",
    "subkomponenLetter": "E",
    "subkomponenNama": "Patroli Pencegahan Karhutla, Penyadartahuan, dan Pemadaman Karhutla bersama Masyarakat dan Stakeholder Lainnya di Kab. Kutai Kartanegara, Kab. Kutai Barat, Kab. Kutai Timur dan Kab. Paser (BB)",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7273.REA.003.524111",
    "defaultKodeMak": "051.E.770",
    "makPrefix": "051.E",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0e",
      "524111"
    ],
    "items": [
      {
        "kode": "000770",
        "suffix": "770",
        "nama": "Uang Harian Petugas dalam rangka Koordinasi",
        "kategori": "uang_harian"
      },
      {
        "kode": "000771",
        "suffix": "771",
        "nama": "Penginapan Petugas dalam rangka Koordinasi",
        "kategori": "penginapan"
      },
      {
        "kode": "000772",
        "suffix": "772",
        "nama": "Transportasi Petugas dalam rangka Koordinasi",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7273-rea-003-051.0f-521211",
    "programKode": "FF",
    "programNama": "Program Pengelolaan Hutan Berkelanjutan",
    "kegiatanKode": "7273",
    "kegiatanNama": "Pengelolaan Kawasan Suaka Alam, Kawasan Pelestarian Alam, dan Taman Buru",
    "kroKode": "REA",
    "kroNama": "Konservasi Kawasan/Rehabilitasi Ekosistem",
    "roKode": "003",
    "roNama": "Pengendalian kebakaran di Kawasan Suaka Alam (KSA), Kawasan Pelestarian Alam (KPA), dan Taman Buru (TB)",
    "komponenKode": "051",
    "komponenNama": "Pengendalian Kebakaran Hutan di KSA, KPA, dan TB",
    "subkomponenKode": "051.0F",
    "subkomponenLetter": "F",
    "subkomponenNama": "Pengadaan seragam Manggala Agni",
    "akunKode": "521211",
    "akunNama": "Belanja Bahan",
    "klasifikasiMak": "7273.REA.003.521211",
    "defaultKodeMak": "051.F.817",
    "makPrefix": "051.F",
    "kategoriGrup": "kebakaran",
    "keywords": [
      "7273",
      "rea",
      "003",
      "051.0f",
      "521211"
    ],
    "items": [
      {
        "kode": "000817",
        "suffix": "817",
        "nama": "Seragam dan sepatu Manggala Agni",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-956-051.0a-524111",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "956",
    "roNama": "Layanan BMN",
    "komponenKode": "051",
    "komponenNama": "Layanan BMN Unit Pelaksana Teknis",
    "subkomponenKode": "051.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pengelolaan BMN",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7315.EBA.956.524111",
    "defaultKodeMak": "051.A.314",
    "makPrefix": "051.A",
    "kategoriGrup": "bmn",
    "keywords": [
      "7315",
      "eba",
      "956",
      "051.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000314",
        "suffix": "314",
        "nama": "Perjadin dalam rangka penatausahaan, penilaian, pengalihan, monitoring dan penyusunan laporan BMN",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-962-057.0a-524111",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "962",
    "roNama": "Layanan Umum",
    "komponenKode": "057",
    "komponenNama": "Dukungan Manajemen Unit Pelaksana Teknis",
    "subkomponenKode": "057.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pengelolaan Rencana Kerja/Kepegawaian/Pelaporan Keuangan",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7315.EBA.962.524111",
    "defaultKodeMak": "057.A.453",
    "makPrefix": "057.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "962",
      "057.0a",
      "524111"
    ],
    "items": [
      {
        "kode": "000453",
        "suffix": "453",
        "nama": "Koordinasi dan Konsultasi dalam rangka rencana kerja/Kepegawaian/Pelaporan Keuangan",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0a-511111",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PNS",
    "akunKode": "511111",
    "akunNama": "Belanja Gaji Pokok PNS",
    "klasifikasiMak": "7315.EBA.994.511111",
    "defaultKodeMak": "001.A.315",
    "makPrefix": "001.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0a",
      "511111"
    ],
    "items": [
      {
        "kode": "000315",
        "suffix": "315",
        "nama": "Belanja Gaji Pokok PNS",
        "kategori": "lainnya"
      },
      {
        "kode": "000316",
        "suffix": "316",
        "nama": "Belanja Gaji Pokok PNS (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000317",
        "suffix": "317",
        "nama": "Belanja Gaji Pokok PNS (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0a-511119",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PNS",
    "akunKode": "511119",
    "akunNama": "Belanja Pembulatan Gaji PNS",
    "klasifikasiMak": "7315.EBA.994.511119",
    "defaultKodeMak": "001.A.318",
    "makPrefix": "001.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0a",
      "511119"
    ],
    "items": [
      {
        "kode": "000318",
        "suffix": "318",
        "nama": "Belanja Pembulatan Gaji Pokok PNS",
        "kategori": "lainnya"
      },
      {
        "kode": "000319",
        "suffix": "319",
        "nama": "Belanja Pembulatan Gaji PNS (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000320",
        "suffix": "320",
        "nama": "Belanja Pembulatan Gaji PNS (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0a-511121",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PNS",
    "akunKode": "511121",
    "akunNama": "Belanja Tunj. Suami/Istri PNS",
    "klasifikasiMak": "7315.EBA.994.511121",
    "defaultKodeMak": "001.A.321",
    "makPrefix": "001.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0a",
      "511121"
    ],
    "items": [
      {
        "kode": "000321",
        "suffix": "321",
        "nama": "Belanja Tunj. Suami/Istri PNS",
        "kategori": "lainnya"
      },
      {
        "kode": "000322",
        "suffix": "322",
        "nama": "Belanja Tunj. Suami/Istri PNS (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000323",
        "suffix": "323",
        "nama": "Belanja Tunj. Suami/Istri PNS (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0a-511122",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PNS",
    "akunKode": "511122",
    "akunNama": "Belanja Tunj. Anak PNS",
    "klasifikasiMak": "7315.EBA.994.511122",
    "defaultKodeMak": "001.A.324",
    "makPrefix": "001.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0a",
      "511122"
    ],
    "items": [
      {
        "kode": "000324",
        "suffix": "324",
        "nama": "Belanja Tunj. Anak PNS",
        "kategori": "lainnya"
      },
      {
        "kode": "000325",
        "suffix": "325",
        "nama": "Belanja Tunj. Anak PNS (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000326",
        "suffix": "326",
        "nama": "Belanja Tunj. Anak PNS (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0a-511123",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PNS",
    "akunKode": "511123",
    "akunNama": "Belanja Tunj. Struktural PNS",
    "klasifikasiMak": "7315.EBA.994.511123",
    "defaultKodeMak": "001.A.327",
    "makPrefix": "001.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0a",
      "511123"
    ],
    "items": [
      {
        "kode": "000327",
        "suffix": "327",
        "nama": "Belanja Tunj. Struktural PNS",
        "kategori": "lainnya"
      },
      {
        "kode": "000328",
        "suffix": "328",
        "nama": "Belanja Tunj. Struktural PNS (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000329",
        "suffix": "329",
        "nama": "Belanja Tunj. Struktural PNS (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0a-511124",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PNS",
    "akunKode": "511124",
    "akunNama": "Belanja Tunj. Fungsional PNS",
    "klasifikasiMak": "7315.EBA.994.511124",
    "defaultKodeMak": "001.A.330",
    "makPrefix": "001.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0a",
      "511124"
    ],
    "items": [
      {
        "kode": "000330",
        "suffix": "330",
        "nama": "Belanja Tunj. Fungsional PNS",
        "kategori": "lainnya"
      },
      {
        "kode": "000331",
        "suffix": "331",
        "nama": "Belanja Tunj. Fungsional PNS (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000332",
        "suffix": "332",
        "nama": "Belanja Tunj. Fungsional PNS (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0a-511125",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PNS",
    "akunKode": "511125",
    "akunNama": "Belanja Tunj. PPh PNS",
    "klasifikasiMak": "7315.EBA.994.511125",
    "defaultKodeMak": "001.A.333",
    "makPrefix": "001.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0a",
      "511125"
    ],
    "items": [
      {
        "kode": "000333",
        "suffix": "333",
        "nama": "Belanja Tunj. PPh PNS",
        "kategori": "lainnya"
      },
      {
        "kode": "000334",
        "suffix": "334",
        "nama": "Belanja Tunj. PPh PNS (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000335",
        "suffix": "335",
        "nama": "Belanja Tunj. PPh PNS (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0a-511126",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PNS",
    "akunKode": "511126",
    "akunNama": "Belanja Tunj. Beras PNS",
    "klasifikasiMak": "7315.EBA.994.511126",
    "defaultKodeMak": "001.A.336",
    "makPrefix": "001.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0a",
      "511126"
    ],
    "items": [
      {
        "kode": "000336",
        "suffix": "336",
        "nama": "Belanja Tunj. Beras PNS",
        "kategori": "lainnya"
      },
      {
        "kode": "000337",
        "suffix": "337",
        "nama": "Belanja Tunj. Beras (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000338",
        "suffix": "338",
        "nama": "Belanja Tunj. Beras (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0a-511129",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PNS",
    "akunKode": "511129",
    "akunNama": "Belanja Uang Makan PNS",
    "klasifikasiMak": "7315.EBA.994.511129",
    "defaultKodeMak": "001.A.339",
    "makPrefix": "001.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0a",
      "511129"
    ],
    "items": [
      {
        "kode": "000339",
        "suffix": "339",
        "nama": "Belanja Uang Makan PNS",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0a-511151",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PNS",
    "akunKode": "511151",
    "akunNama": "Belanja Tunjangan Umum PNS",
    "klasifikasiMak": "7315.EBA.994.511151",
    "defaultKodeMak": "001.A.340",
    "makPrefix": "001.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0a",
      "511151"
    ],
    "items": [
      {
        "kode": "000340",
        "suffix": "340",
        "nama": "Belanja Tunj. Umum PNS",
        "kategori": "lainnya"
      },
      {
        "kode": "000341",
        "suffix": "341",
        "nama": "Belanja Tunjangan Umum PNS (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000342",
        "suffix": "342",
        "nama": "Belanja Tunjangan Umum PNS (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0a-512411",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PNS",
    "akunKode": "512411",
    "akunNama": "Belanja Pegawai (Tunjangan Khusus/Kegiatan/Kinerja)",
    "klasifikasiMak": "7315.EBA.994.512411",
    "defaultKodeMak": "001.A.343",
    "makPrefix": "001.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0a",
      "512411"
    ],
    "items": [
      {
        "kode": "000343",
        "suffix": "343",
        "nama": "Tunjangan Kinerja Pegawai",
        "kategori": "lainnya"
      },
      {
        "kode": "000344",
        "suffix": "344",
        "nama": "Tunjangan Kinerja Pegawai (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000345",
        "suffix": "345",
        "nama": "Tunjangan Kinerja Pegawai (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0b-511151",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PPPK",
    "akunKode": "511151",
    "akunNama": "Belanja Tunjangan Umum PNS",
    "klasifikasiMak": "7315.EBA.994.511151",
    "defaultKodeMak": "001.B.346",
    "makPrefix": "001.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0b",
      "511151"
    ],
    "items": [
      {
        "kode": "000346",
        "suffix": "346",
        "nama": "Belanja Tunj. Umum PPPK",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0b-511611",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PPPK",
    "akunKode": "511611",
    "akunNama": "Belanja Gaji Pokok PPPK",
    "klasifikasiMak": "7315.EBA.994.511611",
    "defaultKodeMak": "001.B.349",
    "makPrefix": "001.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0b",
      "511611"
    ],
    "items": [
      {
        "kode": "000349",
        "suffix": "349",
        "nama": "Belanja Gaji Pokok PPPK",
        "kategori": "lainnya"
      },
      {
        "kode": "000350",
        "suffix": "350",
        "nama": "Belanja Gaji Pokok PPPK (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000351",
        "suffix": "351",
        "nama": "Belanja Gaji Pokok PPPK (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0b-511619",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PPPK",
    "akunKode": "511619",
    "akunNama": "Belanja Pembulatan Gaji PPPK",
    "klasifikasiMak": "7315.EBA.994.511619",
    "defaultKodeMak": "001.B.352",
    "makPrefix": "001.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0b",
      "511619"
    ],
    "items": [
      {
        "kode": "000352",
        "suffix": "352",
        "nama": "Belanja Pembulatan Gaji Pokok PPPK",
        "kategori": "lainnya"
      },
      {
        "kode": "000353",
        "suffix": "353",
        "nama": "Belanja Pembulatan Gaji PPPK (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000354",
        "suffix": "354",
        "nama": "Belanja Pembulatan Gaji PPPK (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0b-511621",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PPPK",
    "akunKode": "511621",
    "akunNama": "Belanja Tunjangan Suami/Istri PPPK",
    "klasifikasiMak": "7315.EBA.994.511621",
    "defaultKodeMak": "001.B.355",
    "makPrefix": "001.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0b",
      "511621"
    ],
    "items": [
      {
        "kode": "000355",
        "suffix": "355",
        "nama": "Belanja Tunj. Suami/Istri PPPK",
        "kategori": "lainnya"
      },
      {
        "kode": "000356",
        "suffix": "356",
        "nama": "Belanja Tunj. Suami/Istri PPPK (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000357",
        "suffix": "357",
        "nama": "Belanja Tunj. Suami/Istri PPPK (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0b-511622",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PPPK",
    "akunKode": "511622",
    "akunNama": "Belanja Tunjangan Anak PPPK",
    "klasifikasiMak": "7315.EBA.994.511622",
    "defaultKodeMak": "001.B.358",
    "makPrefix": "001.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0b",
      "511622"
    ],
    "items": [
      {
        "kode": "000358",
        "suffix": "358",
        "nama": "Belanja Tunj. Anak PPPK",
        "kategori": "lainnya"
      },
      {
        "kode": "000359",
        "suffix": "359",
        "nama": "Belanja Tunj. Anak PPPK (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000360",
        "suffix": "360",
        "nama": "Belanja Tunj. Anak PPPK (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0b-511624",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PPPK",
    "akunKode": "511624",
    "akunNama": "Belanja Tunjangan Fungsional PPPK",
    "klasifikasiMak": "7315.EBA.994.511624",
    "defaultKodeMak": "001.B.361",
    "makPrefix": "001.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0b",
      "511624"
    ],
    "items": [
      {
        "kode": "000361",
        "suffix": "361",
        "nama": "Belanja Tunj. Fungsional PPPK",
        "kategori": "lainnya"
      },
      {
        "kode": "000362",
        "suffix": "362",
        "nama": "Belanja Tunj. Fungsional PPPK (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000363",
        "suffix": "363",
        "nama": "Belanja Tunj. Fungsional PPPK (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0b-511625",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PPPK",
    "akunKode": "511625",
    "akunNama": "Belanja Tunjangan Beras PPPK",
    "klasifikasiMak": "7315.EBA.994.511625",
    "defaultKodeMak": "001.B.364",
    "makPrefix": "001.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0b",
      "511625"
    ],
    "items": [
      {
        "kode": "000364",
        "suffix": "364",
        "nama": "Belanja Tunj. Beras PPPK",
        "kategori": "lainnya"
      },
      {
        "kode": "000365",
        "suffix": "365",
        "nama": "Belanja Tunj. Beras PPPK (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000366",
        "suffix": "366",
        "nama": "Belanja Tunj. Beras PPPK (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0b-511628",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PPPK",
    "akunKode": "511628",
    "akunNama": "Belanja Uang Makan PPPK",
    "klasifikasiMak": "7315.EBA.994.511628",
    "defaultKodeMak": "001.B.367",
    "makPrefix": "001.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0b",
      "511628"
    ],
    "items": [
      {
        "kode": "000367",
        "suffix": "367",
        "nama": "Belanja Uang Makan PPPK",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0b-511633",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PPPK",
    "akunKode": "511633",
    "akunNama": "Belanja Tunjangan Umum PPPK",
    "klasifikasiMak": "7315.EBA.994.511633",
    "defaultKodeMak": "001.B.555",
    "makPrefix": "001.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0b",
      "511633"
    ],
    "items": [
      {
        "kode": "000555",
        "suffix": "555",
        "nama": "Belanja Tunj. Umum PPPK",
        "kategori": "lainnya"
      },
      {
        "kode": "000556",
        "suffix": "556",
        "nama": "Belanja Tunj. Umum PPPK (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000557",
        "suffix": "557",
        "nama": "Belanja Tunj. Umum PPPK (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-001.0b-512414",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "001",
    "komponenNama": "Gaji dan Tunjangan",
    "subkomponenKode": "001.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Pembayaran Gaji dan Tunjangan PPPK",
    "akunKode": "512414",
    "akunNama": "Belanja Pegawai Tunjangan Khusus/Kegiatan/Kinerja PPPK",
    "klasifikasiMak": "7315.EBA.994.512414",
    "defaultKodeMak": "001.B.368",
    "makPrefix": "001.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "001.0b",
      "512414"
    ],
    "items": [
      {
        "kode": "000368",
        "suffix": "368",
        "nama": "Tunjangan Kinerja Pegawai PPPK",
        "kategori": "lainnya"
      },
      {
        "kode": "000369",
        "suffix": "369",
        "nama": "Tunjangan Kinerja Pegawai PPPK (Gaji ke",
        "kategori": "lainnya"
      },
      {
        "kode": "000370",
        "suffix": "370",
        "nama": "Tunjangan Kinerja Pegawai PPPK (Gaji ke",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0a-521111",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Keperluan Sehari-hari perkantoran",
    "akunKode": "521111",
    "akunNama": "Belanja Keperluan Perkantoran",
    "klasifikasiMak": "7315.EBA.994.521111",
    "defaultKodeMak": "002.A.371",
    "makPrefix": "002.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0a",
      "521111"
    ],
    "items": [
      {
        "kode": "000371",
        "suffix": "371",
        "nama": "Honorarium Tenaga Alih Daya Cleaning Service untuk Balai dan SKW",
        "kategori": "honor"
      },
      {
        "kode": "000372",
        "suffix": "372",
        "nama": "Honorium Tenaga Alih Daya untuk Tenaga Keamanan pada Balai dan SKW",
        "kategori": "honor"
      },
      {
        "kode": "000373",
        "suffix": "373",
        "nama": "Biaya Penggantian Biaya Materai",
        "kategori": "lainnya"
      },
      {
        "kode": "000374",
        "suffix": "374",
        "nama": "keperluan Sehari-hari Perkantoran lebih dari (Kalimantan Timur)",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0a-521811",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0A",
    "subkomponenLetter": "A",
    "subkomponenNama": "Keperluan Sehari-hari perkantoran",
    "akunKode": "521811",
    "akunNama": "Belanja Barang Persediaan Barang Konsumsi",
    "klasifikasiMak": "7315.EBA.994.521811",
    "defaultKodeMak": "002.A.375",
    "makPrefix": "002.A",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0a",
      "521811"
    ],
    "items": [
      {
        "kode": "000375",
        "suffix": "375",
        "nama": "keperluan Sehari-hari Perkantoran lebih dari (Kalimantan Timur)",
        "kategori": "lainnya"
      },
      {
        "kode": "000376",
        "suffix": "376",
        "nama": "Pencetakan karcis masuk pengunjung kawasan TWA. Pulau Sangalaki",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0b-521111",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Langganan Daya dan Jasa",
    "akunKode": "521111",
    "akunNama": "Belanja Keperluan Perkantoran",
    "klasifikasiMak": "7315.EBA.994.521111",
    "defaultKodeMak": "002.B.377",
    "makPrefix": "002.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0b",
      "521111"
    ],
    "items": [
      {
        "kode": "000377",
        "suffix": "377",
        "nama": "Langganan Internet Kantor Balai",
        "kategori": "lainnya"
      },
      {
        "kode": "000378",
        "suffix": "378",
        "nama": "Langganan Internet SKW I dan RKW",
        "kategori": "lainnya"
      },
      {
        "kode": "000379",
        "suffix": "379",
        "nama": "Langganan Internet SKW II dan RKW",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0b-521114",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Langganan Daya dan Jasa",
    "akunKode": "521114",
    "akunNama": "Belanja Pengiriman Surat Dinas Pos Pusat",
    "klasifikasiMak": "7315.EBA.994.521114",
    "defaultKodeMak": "002.B.380",
    "makPrefix": "002.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0b",
      "521114"
    ],
    "items": [
      {
        "kode": "000380",
        "suffix": "380",
        "nama": "Kantor Balai",
        "kategori": "lainnya"
      },
      {
        "kode": "000381",
        "suffix": "381",
        "nama": "SKW I dan RKW",
        "kategori": "lainnya"
      },
      {
        "kode": "000382",
        "suffix": "382",
        "nama": "SKW II dan RKW",
        "kategori": "lainnya"
      },
      {
        "kode": "000383",
        "suffix": "383",
        "nama": "SKW III dan RKW",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0b-522111",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Langganan Daya dan Jasa",
    "akunKode": "522111",
    "akunNama": "Belanja Langganan Listrik",
    "klasifikasiMak": "7315.EBA.994.522111",
    "defaultKodeMak": "002.B.384",
    "makPrefix": "002.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0b",
      "522111"
    ],
    "items": [
      {
        "kode": "000384",
        "suffix": "384",
        "nama": "Kantor Balai, Seksi Wilayah dan Resort",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0b-522112",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Langganan Daya dan Jasa",
    "akunKode": "522112",
    "akunNama": "Belanja Langganan Telepon",
    "klasifikasiMak": "7315.EBA.994.522112",
    "defaultKodeMak": "002.B.385",
    "makPrefix": "002.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0b",
      "522112"
    ],
    "items": [
      {
        "kode": "000385",
        "suffix": "385",
        "nama": "Langganan Telpon Balai KSDA Kalimantan Timur",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0b-522113",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Langganan Daya dan Jasa",
    "akunKode": "522113",
    "akunNama": "Belanja Langganan Air",
    "klasifikasiMak": "7315.EBA.994.522113",
    "defaultKodeMak": "002.B.386",
    "makPrefix": "002.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0b",
      "522113"
    ],
    "items": [
      {
        "kode": "000386",
        "suffix": "386",
        "nama": "Kantor Balai",
        "kategori": "lainnya"
      },
      {
        "kode": "000387",
        "suffix": "387",
        "nama": "SKW I dan RKW",
        "kategori": "lainnya"
      },
      {
        "kode": "000388",
        "suffix": "388",
        "nama": "SKW II dan RKW",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0b-522119",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Langganan Daya dan Jasa",
    "akunKode": "522119",
    "akunNama": "Belanja Langganan Daya dan Jasa Lainnya",
    "klasifikasiMak": "7315.EBA.994.522119",
    "defaultKodeMak": "002.B.389",
    "makPrefix": "002.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0b",
      "522119"
    ],
    "items": [
      {
        "kode": "000389",
        "suffix": "389",
        "nama": "Biaya Aplikasi Rapat Virtual, Biaya Langganan Cloud Storage dan aplikasi berbayar lainnya yang menunjang tupoksi",
        "kategori": "lainnya"
      },
      {
        "kode": "000390",
        "suffix": "390",
        "nama": "Pembayaran PGN",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0b-522141",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0B",
    "subkomponenLetter": "B",
    "subkomponenNama": "Langganan Daya dan Jasa",
    "akunKode": "522141",
    "akunNama": "Belanja Sewa",
    "klasifikasiMak": "7315.EBA.994.522141",
    "defaultKodeMak": "002.B.393",
    "makPrefix": "002.B",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0b",
      "522141"
    ],
    "items": [
      {
        "kode": "000393",
        "suffix": "393",
        "nama": "Rumah Dinas Kepala Seksi KSDA Wilayah I Berau",
        "kategori": "lainnya"
      },
      {
        "kode": "000394",
        "suffix": "394",
        "nama": "Rumah Dinas Kepala Seksi KSDA Wilayah II Tenggarong",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0c-523111",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Pemeliharaan Kantor",
    "akunKode": "523111",
    "akunNama": "Belanja Pemeliharaan Gedung dan Bangunan",
    "klasifikasiMak": "7315.EBA.994.523111",
    "defaultKodeMak": "002.C.395",
    "makPrefix": "002.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0c",
      "523111"
    ],
    "items": [
      {
        "kode": "000395",
        "suffix": "395",
        "nama": "Pemeliharaan gedung dan bangunan serta pagar/halaman Kantor Balai dan Rumah Dinas",
        "kategori": "lainnya"
      },
      {
        "kode": "000396",
        "suffix": "396",
        "nama": "Pemeliharaan gedung dan bangunan serta pagar/halaman Kantor Seksi KSDA dan Pondok Kerja Resor di Seksi KSDA Wil. I Berau",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0c-523121",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Pemeliharaan Kantor",
    "akunKode": "523121",
    "akunNama": "Belanja Pemeliharaan Peralatan dan Mesin",
    "klasifikasiMak": "7315.EBA.994.523121",
    "defaultKodeMak": "002.C.399",
    "makPrefix": "002.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0c",
      "523121"
    ],
    "items": [
      {
        "kode": "000399",
        "suffix": "399",
        "nama": "Biaya Pemeliharaan dan Operasional Kendaraan Roda (Kalimantan Timur)",
        "kategori": "transport"
      },
      {
        "kode": "000400",
        "suffix": "400",
        "nama": "Biaya Pemeliharaan dan Operasional Kendaraan Operasional Lapangan (Double Gardan) (Kalimantan Timur)",
        "kategori": "transport"
      },
      {
        "kode": "000401",
        "suffix": "401",
        "nama": "Biaya Pemeliharaan dan Operasional Kendaraan Roda",
        "kategori": "transport"
      },
      {
        "kode": "000402",
        "suffix": "402",
        "nama": "Biaya Pemeliharaan dan Operasional Kendaraan Roda",
        "kategori": "transport"
      },
      {
        "kode": "000403",
        "suffix": "403",
        "nama": "Biaya Pemeliharaan dan Operasional Kendaraan Long Boat/Klotok/Perahu Tempel",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0c-523129",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Pemeliharaan Kantor",
    "akunKode": "523129",
    "akunNama": "Belanja Pemeliharaan Peralatan dan Mesin Lainnya",
    "klasifikasiMak": "7315.EBA.994.523129",
    "defaultKodeMak": "002.C.404",
    "makPrefix": "002.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0c",
      "523129"
    ],
    "items": [
      {
        "kode": "000404",
        "suffix": "404",
        "nama": "Pemeliharaan Personal Computer/Notebook",
        "kategori": "lainnya"
      },
      {
        "kode": "000405",
        "suffix": "405",
        "nama": "Pemeliharaan Printer",
        "kategori": "lainnya"
      },
      {
        "kode": "000406",
        "suffix": "406",
        "nama": "Pemeliharaan AC Split",
        "kategori": "lainnya"
      },
      {
        "kode": "000407",
        "suffix": "407",
        "nama": "Pemeliharaan Genset",
        "kategori": "lainnya"
      },
      {
        "kode": "000408",
        "suffix": "408",
        "nama": "Tabung Apar",
        "kategori": "lainnya"
      },
      {
        "kode": "000409",
        "suffix": "409",
        "nama": "CCTV",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0c-523133",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0C",
    "subkomponenLetter": "C",
    "subkomponenNama": "Pemeliharaan Kantor",
    "akunKode": "523133",
    "akunNama": "Belanja Pemeliharaan Jaringan",
    "klasifikasiMak": "7315.EBA.994.523133",
    "defaultKodeMak": "002.C.410",
    "makPrefix": "002.C",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0c",
      "523133"
    ],
    "items": [
      {
        "kode": "000410",
        "suffix": "410",
        "nama": "Biaya pemeliharaan jaringan internet",
        "kategori": "lainnya"
      },
      {
        "kode": "000411",
        "suffix": "411",
        "nama": "Biaya pemeliharaan jaringan listrik",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0d-521115",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0D",
    "subkomponenLetter": "D",
    "subkomponenNama": "Pembayaran terkait Pelaksanaan Operasional Perkantoran",
    "akunKode": "521115",
    "akunNama": "Belanja Honor Operasional Satuan Kerja",
    "klasifikasiMak": "7315.EBA.994.521115",
    "defaultKodeMak": "002.D.414",
    "makPrefix": "002.D",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0d",
      "521115"
    ],
    "items": [
      {
        "kode": "000414",
        "suffix": "414",
        "nama": "Honorarium Pejabat Kuasa Pengguna Anggaran (pagu dana di atas Rp10 miliar s.d. Rp25 miliar)",
        "kategori": "honor"
      },
      {
        "kode": "000415",
        "suffix": "415",
        "nama": "Honorarium Pejabat Pembuat Komitmen (pagu dana di atas Rp10 miliar s.d. Rp25 miliar)",
        "kategori": "honor"
      },
      {
        "kode": "000416",
        "suffix": "416",
        "nama": "Honorarium Pejabat Penguji Tagihan Penandatangan Spm (pagu dana di atas Rp10 miliar s.d. Rp25 miliar)",
        "kategori": "honor"
      },
      {
        "kode": "000417",
        "suffix": "417",
        "nama": "Honorarium Bendahara Pengeluaran (pagu dana di atas Rp10 miliar s.d. Rp25 miliar)",
        "kategori": "honor"
      },
      {
        "kode": "000418",
        "suffix": "418",
        "nama": "Honorarium Staf Pengelola (pagu dana di atas Rp10 miliar s.d. Rp25 miliar)",
        "kategori": "honor"
      },
      {
        "kode": "000419",
        "suffix": "419",
        "nama": "Honorarium PPABP (pagu dana di atas Rp10 miliar s.d. Rp25 miliar)",
        "kategori": "honor"
      },
      {
        "kode": "000420",
        "suffix": "420",
        "nama": "Honorarium Pengurus/Penyimpan Bmn Tingkat Kuasa Pengguna Barang",
        "kategori": "honor"
      },
      {
        "kode": "000421",
        "suffix": "421",
        "nama": "Honorarium Pejabat Pengadaan Barang/Jasa",
        "kategori": "honor"
      },
      {
        "kode": "000423",
        "suffix": "423",
        "nama": "Honorarium Ketua/Wakil Ketua (UAKPA/Barang)",
        "kategori": "honor"
      },
      {
        "kode": "000424",
        "suffix": "424",
        "nama": "Honorarium Anggota/Petugas (UAKPA/Barang)",
        "kategori": "honor"
      },
      {
        "kode": "000426",
        "suffix": "426",
        "nama": "Honorarium Bendahara Pengelola Pnbp (pagu dana di atas Rp250 juta s.d. Rp500 juta)",
        "kategori": "honor"
      },
      {
        "kode": "000427",
        "suffix": "427",
        "nama": "Honorarium Anggota Pengelola Pnbp (pagu dana di atas Rp250 juta s.d. Rp500 juta)",
        "kategori": "honor"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0e-521119",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0E",
    "subkomponenLetter": "E",
    "subkomponenNama": "Patroli Perlindungan dan Pengamanan",
    "akunKode": "521119",
    "akunNama": "Belanja Barang Operasional Lainnya",
    "klasifikasiMak": "7315.EBA.994.521119",
    "defaultKodeMak": "002.E.428",
    "makPrefix": "002.E",
    "kategoriGrup": "patroli",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0e",
      "521119"
    ],
    "items": [
      {
        "kode": "000428",
        "suffix": "428",
        "nama": "Biaya Operasional Petugas Pengamanan Hutan di Resort Sangalaki Semama",
        "kategori": "operasional"
      },
      {
        "kode": "000429",
        "suffix": "429",
        "nama": "Upah Harian dan Uang Makan MMP di TWA. Pulau Sangalaki",
        "kategori": "uang_harian"
      },
      {
        "kode": "000430",
        "suffix": "430",
        "nama": "Upah Harian dan Uang Makan MMP di SM. Pulau Semama",
        "kategori": "uang_harian"
      },
      {
        "kode": "000431",
        "suffix": "431",
        "nama": "Biaya Operasional Petugas Pengamanan Hutan di Resort CA Padang Luwai",
        "kategori": "operasional"
      },
      {
        "kode": "000432",
        "suffix": "432",
        "nama": "Upah Harian dan Uang Makan MMP di Resort CA Padang Luwai",
        "kategori": "uang_harian"
      },
      {
        "kode": "000433",
        "suffix": "433",
        "nama": "Biaya Operasional Petugas Pengamanan Hutan di Resort CA Muara Kaman",
        "kategori": "operasional"
      },
      {
        "kode": "000558",
        "suffix": "558",
        "nama": "Upah Harian dan Uang Makan MMP di Resort CA Muara Kaman Sedulang",
        "kategori": "uang_harian"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0f-521119",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0F",
    "subkomponenLetter": "F",
    "subkomponenNama": "Evakuasi dan Pakan Satwa",
    "akunKode": "521119",
    "akunNama": "Belanja Barang Operasional Lainnya",
    "klasifikasiMak": "7315.EBA.994.521119",
    "defaultKodeMak": "002.F.436",
    "makPrefix": "002.F",
    "kategoriGrup": "satwa",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0f",
      "521119"
    ],
    "items": [
      {
        "kode": "000436",
        "suffix": "436",
        "nama": "Biaya Operasional Pengamanan Hutan dalam rangka Penanganan Satwa Translokasi/ Konflik/ Evakuasi/ Sosialisasi / Anjangsana",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0f-521219",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0F",
    "subkomponenLetter": "F",
    "subkomponenNama": "Evakuasi dan Pakan Satwa",
    "akunKode": "521219",
    "akunNama": "Belanja Barang Non Operasional Lainnya",
    "klasifikasiMak": "7315.EBA.994.521219",
    "defaultKodeMak": "002.F.439",
    "makPrefix": "002.F",
    "kategoriGrup": "satwa",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0f",
      "521219"
    ],
    "items": [
      {
        "kode": "000439",
        "suffix": "439",
        "nama": "Biaya Pembelian Perlengkapan untuk Penanganan Interaksi Negatif Satwa dengan Manusia",
        "kategori": "lainnya"
      },
      {
        "kode": "000440",
        "suffix": "440",
        "nama": "Biaya Transportasi untuk Penanganan Interaksi Negatif Satwa dengan Manusia",
        "kategori": "transport"
      },
      {
        "kode": "000441",
        "suffix": "441",
        "nama": "Biaya Pemeriksaan Medis Satwa",
        "kategori": "lainnya"
      },
      {
        "kode": "000442",
        "suffix": "442",
        "nama": "Biaya Pembelian Pakan Satwa",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0f-523121",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0F",
    "subkomponenLetter": "F",
    "subkomponenNama": "Evakuasi dan Pakan Satwa",
    "akunKode": "523121",
    "akunNama": "Belanja Pemeliharaan Peralatan dan Mesin",
    "klasifikasiMak": "7315.EBA.994.523121",
    "defaultKodeMak": "002.F.446",
    "makPrefix": "002.F",
    "kategoriGrup": "satwa",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0f",
      "523121"
    ],
    "items": [
      {
        "kode": "000446",
        "suffix": "446",
        "nama": "Biaya Pemeliharaan dan Operasional Kendaraan Operasional Lapangan (Double Gardan) (Kalimantan Timur) untuk Penanganan Interaksi N",
        "kategori": "transport"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0f-524111",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0F",
    "subkomponenLetter": "F",
    "subkomponenNama": "Evakuasi dan Pakan Satwa",
    "akunKode": "524111",
    "akunNama": "Belanja Perjalanan Dinas Biasa",
    "klasifikasiMak": "7315.EBA.994.524111",
    "defaultKodeMak": "002.F.447",
    "makPrefix": "002.F",
    "kategoriGrup": "satwa",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0f",
      "524111"
    ],
    "items": [
      {
        "kode": "000447",
        "suffix": "447",
        "nama": "Koordinasi dan Konsultasi ke Wilayah Kerja dalam rangka Penanganan Interaksi Negatif Satwa dengan Manusia",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0g-521111",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0G",
    "subkomponenLetter": "G",
    "subkomponenNama": "Pengelolaan Jasa Lingkungan Wisata Alam",
    "akunKode": "521111",
    "akunNama": "Belanja Keperluan Perkantoran",
    "klasifikasiMak": "7315.EBA.994.521111",
    "defaultKodeMak": "002.G.448",
    "makPrefix": "002.G",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0g",
      "521111"
    ],
    "items": [
      {
        "kode": "000448",
        "suffix": "448",
        "nama": "Langganan Internet di TWA Pulau Sangalaki",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0g-521119",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0G",
    "subkomponenLetter": "G",
    "subkomponenNama": "Pengelolaan Jasa Lingkungan Wisata Alam",
    "akunKode": "521119",
    "akunNama": "Belanja Barang Operasional Lainnya",
    "klasifikasiMak": "7315.EBA.994.521119",
    "defaultKodeMak": "002.G.449",
    "makPrefix": "002.G",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0g",
      "521119"
    ],
    "items": [
      {
        "kode": "000449",
        "suffix": "449",
        "nama": "Operasional untuk Penjagaan, Pelayanan, dan Pemantauan Pengunjung pada Peak Season",
        "kategori": "operasional"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0g-523111",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0G",
    "subkomponenLetter": "G",
    "subkomponenNama": "Pengelolaan Jasa Lingkungan Wisata Alam",
    "akunKode": "523111",
    "akunNama": "Belanja Pemeliharaan Gedung dan Bangunan",
    "klasifikasiMak": "7315.EBA.994.523111",
    "defaultKodeMak": "002.G.450",
    "makPrefix": "002.G",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0g",
      "523111"
    ],
    "items": [
      {
        "kode": "000450",
        "suffix": "450",
        "nama": "Pemeliharaan gedung dan bangunan serta pagar/halaman Pondok Kerja Resor Sangalaki",
        "kategori": "lainnya"
      }
    ]
  },
  {
    "id": "dipa-7315-eba-994-002.0g-523121",
    "programKode": "WA",
    "programNama": "Program Dukungan Manajemen",
    "kegiatanKode": "7315",
    "kegiatanNama": "Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Ditjen Konservasi Sumberdaya Alam dan Ekosistem",
    "kroKode": "EBA",
    "kroNama": "Layanan Dukungan Manajemen Internal",
    "roKode": "994",
    "roNama": "Layanan Perkantoran",
    "komponenKode": "002",
    "komponenNama": "Operasional dan Pemeliharaan Kantor",
    "subkomponenKode": "002.0G",
    "subkomponenLetter": "G",
    "subkomponenNama": "Pengelolaan Jasa Lingkungan Wisata Alam",
    "akunKode": "523121",
    "akunNama": "Belanja Pemeliharaan Peralatan dan Mesin",
    "klasifikasiMak": "7315.EBA.994.523121",
    "defaultKodeMak": "002.G.451",
    "makPrefix": "002.G",
    "kategoriGrup": "pemulihan",
    "keywords": [
      "7315",
      "eba",
      "994",
      "002.0g",
      "523121"
    ],
    "items": [
      {
        "kode": "000451",
        "suffix": "451",
        "nama": "Biaya Pemeliharaan dan Operasional Kendaraan Speed Boat untuk Pengelolaan Jasa Lingkungan Wisata Alam",
        "kategori": "transport"
      },
      {
        "kode": "000452",
        "suffix": "452",
        "nama": "Biaya Pemeliharaan dan Operasional Kendaraan Long Boat untuk Pengelolaan Jasa Lingkungan Wisata Alam",
        "kategori": "transport"
      }
    ]
  }
];

/**
 * Filter / Search function for DIPA FA Detail entries
 */
export function searchDipaFaEntries(query: string, kategori?: string): DipaBudgetEntry[] {
  const cleanQ = query.trim().toLowerCase();

  return DIPA_FA_DETAIL_ENTRIES.filter((entry) => {
    if (kategori && kategori !== "all" && entry.kategoriGrup !== kategori) {
      return false;
    }
    if (!cleanQ) return true;

    return (
      entry.kegiatanKode.toLowerCase().includes(cleanQ) ||
      entry.kegiatanNama.toLowerCase().includes(cleanQ) ||
      entry.kroKode.toLowerCase().includes(cleanQ) ||
      entry.roKode.toLowerCase().includes(cleanQ) ||
      entry.roNama.toLowerCase().includes(cleanQ) ||
      entry.subkomponenKode.toLowerCase().includes(cleanQ) ||
      entry.subkomponenNama.toLowerCase().includes(cleanQ) ||
      entry.akunKode.toLowerCase().includes(cleanQ) ||
      entry.akunNama.toLowerCase().includes(cleanQ) ||
      entry.klasifikasiMak.toLowerCase().includes(cleanQ) ||
      entry.items.some((it) => it.nama.toLowerCase().includes(cleanQ) || it.suffix.includes(cleanQ))
    );
  });
}

/**
 * Helper: Daftar Kegiatan unik untuk Dropdown Tingkat 1
 */
export function getDipaKegiatanList() {
  const map = new Map<string, { kode: string; nama: string; programKode: string; programNama: string }>();
  DIPA_FA_DETAIL_ENTRIES.forEach((e) => {
    if (!map.has(e.kegiatanKode)) {
      map.set(e.kegiatanKode, {
        kode: e.kegiatanKode,
        nama: e.kegiatanNama,
        programKode: e.programKode,
        programNama: e.programNama,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.kode.localeCompare(b.kode));
}

/**
 * Helper: Daftar RO unik untuk Dropdown Tingkat 2 sesuai Kegiatan
 */
export function getDipaRoListByKegiatan(kegiatanKode: string) {
  const map = new Map<string, { kode: string; nama: string; kroKode: string; kroNama: string }>();
  DIPA_FA_DETAIL_ENTRIES.filter((e) => e.kegiatanKode === kegiatanKode).forEach((e) => {
    const fullRo = `${e.kroKode}.${e.roKode}`;
    if (!map.has(fullRo)) {
      map.set(fullRo, {
        kode: fullRo,
        nama: e.roNama,
        kroKode: e.kroKode,
        kroNama: e.kroNama,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.kode.localeCompare(b.kode));
}

/**
 * Helper: Daftar Subkomponen untuk Dropdown Tingkat 3 sesuai RO
 */
export function getDipaSubkomponenListByRo(kegiatanKode: string, fullRo: string) {
  const map = new Map<string, { kode: string; letter: string; nama: string }>();
  DIPA_FA_DETAIL_ENTRIES.filter(
    (e) => e.kegiatanKode === kegiatanKode && `${e.kroKode}.${e.roKode}` === fullRo
  ).forEach((e) => {
    if (!map.has(e.subkomponenKode)) {
      map.set(e.subkomponenKode, {
        kode: e.subkomponenKode,
        letter: e.subkomponenLetter,
        nama: e.subkomponenNama,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.kode.localeCompare(b.kode));
}

/**
 * Helper: Daftar Akun untuk Dropdown Tingkat 4 sesuai Subkomponen
 */
export function getDipaAkunListBySubkomponen(kegiatanKode: string, fullRo: string, subkomponenKode: string) {
  const map = new Map<string, { kode: string; nama: string; entry: DipaBudgetEntry }>();
  DIPA_FA_DETAIL_ENTRIES.filter(
    (e) =>
      e.kegiatanKode === kegiatanKode &&
      `${e.kroKode}.${e.roKode}` === fullRo &&
      e.subkomponenKode === subkomponenKode
  ).forEach((e) => {
    if (!map.has(e.akunKode)) {
      map.set(e.akunKode, {
        kode: e.akunKode,
        nama: e.akunNama,
        entry: e,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) => a.kode.localeCompare(b.kode));
}

/**
 * Helper: Daftar Item Biaya untuk Dropdown Tingkat 5 sesuai Akun & Subkomponen
 */
export function getDipaItemsByAkun(kegiatanKode: string, fullRo: string, subkomponenKode: string, akunKode: string) {
  const found = DIPA_FA_DETAIL_ENTRIES.find(
    (e) =>
      e.kegiatanKode === kegiatanKode &&
      `${e.kroKode}.${e.roKode}` === fullRo &&
      e.subkomponenKode === subkomponenKode &&
      e.akunKode === akunKode
  );
  return found ? found.items : [];
}
