import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader2,
  FileSpreadsheet,
  Search,
  ChevronsUpDown,
  Check,
  Image as ImageIcon,
  Plus,
  Trash2,
  Printer,
  Layers,
  Sparkles,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SmartPatrolPrint, SmartPatrolReportData, TemuanSatwaLiarItem } from "./SmartPatrolPrint";

interface SmartPatrolInlineFormProps {
  onBack: () => void;
}

interface MySuratTugasOption {
  id: string;
  nomor_surat: string | null;
  maksud_tujuan: string;
  employees?: Array<{
    id: string;
    nama_lengkap: string;
    nip: string;
    jabatan: string;
    satuan_kerja?: string;
  }>;
}

export function SmartPatrolInlineForm({ onBack }: SmartPatrolInlineFormProps) {
  const [loadingST, setLoadingST] = useState(false);
  const [stOptions, setStOptions] = useState<MySuratTugasOption[]>([]);
  
  const [selectedSTId, setSelectedSTId] = useState<string>("");
  const [stSearch, setStSearch] = useState("");
  const [stPopoverOpen, setStPopoverOpen] = useState(false);

  // === Section I: Cover ===
  const [coverMode, setCoverMode] = useState<"standard" | "custom">("standard");
  const [customCoverFile, setCustomCoverFile] = useState<File | null>(null);
  const [customCoverPreview, setCustomCoverPreview] = useState<string>("");

  // === Section II: Basic Info ===
  const [namaKegiatan, setNamaKegiatan] = useState("");
  const [sumberDana, setSumberDana] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [dinilaiOleh, setDinilaiOleh] = useState("");
  const [disusunOleh, setDisusunOleh] = useState("");

  // === Section III - V ===
  const [kataPengantar, setKataPengantar] = useState(`Puji syukur ke hadirat Tuhan Yang Maha Esa, karena berkat rahmat dan bimbingan-Nya, kegiatan Perlindungan dan Pengamanan Kawasan Konservasi di Suaka Margasatwa Kelian Lestari dapat terlaksana dengan lancar. Upaya menjaga kawasan konservasi bukan hanya tanggung jawab institusi, melainkan kewajiban bersama untuk memastikan kelestarian sumber daya alam tetap terjaga bagi generasi mendatang.

Kawasan konservasi memiliki nilai strategis sebagai penyangga kehidupan, penyedia jasa ekosistem, dan rumah bagi beragam satwa liar. Namun demikian, tantangan yang dihadapi di lapangan tidaklah sederhana. Ancaman perburuan satwa, pembalakan liar, perambahan kawasan, serta aktivitas pertambangan ilegal masih terus mengintai dan berpotensi merusak keseimbangan alam. Situasi ini menuntut adanya langkah yang terencana, adaptif, dan berbasis teknologi.

Dalam rangka menjawab tantangan tersebut, diterapkanlah inovasi melalui pemanfaatan aplikasi SMART Patrol (Spatial Monitoring and Reporting Tool). Kehadiran aplikasi ini memberikan dukungan nyata dalam mendata hasil patroli, memantau kondisi kawasan, serta menyajikan informasi yang akurat dan terstruktur. Dengan demikian, setiap hasil pengamatan lapangan dapat ditindaklanjuti secara tepat dan menjadi dasar pengambilan keputusan.

Laporan ini tidak hanya mencatat kegiatan perlindungan kawasan, tetapi juga merefleksikan komitmen, kerja keras, dan sinergi berbagai pihak dalam menjaga kelestarian hutan dan keanekaragaman hayati. Setiap langkah yang dilakukan di kawasan hutan merupakan wujud nyata dari tekad menjaga warisan alam agar tetap lestari sepanjang masa.

Semoga laporan ini dapat bermanfaat, memberi inspirasi, dan memperkuat semangat perlindungan kawasan konservasi. Ucapan terima kasih yang setulusnya kami sampaikan kepada semua pihak yang telah berkontribusi, baik dalam bentuk tenaga, pikiran, maupun dukungan lainnya.`);
  const [daftarIsi, setDaftarIsi] = useState("");
  const [daftarLampiran, setDaftarLampiran] = useState("");

  // === BAB I Pendahuluan ===
  const [latarBelakang, setLatarBelakang] = useState(`Suaka Margasatwa Kelian Lestari adalah salah satu kawasan konservasi yang memiliki nilai strategis dalam menjaga keseimbangan ekosistem serta kelestarian keanekaragaman hayati di Kalimantan Timur. Kawasan ini menyimpan berbagai potensi biodiversitas, baik flora maupun fauna, termasuk jenis satwa liar dilindungi yang berperan penting dalam menjaga kestabilan rantai ekologi. Tidak hanya itu, keberadaan kawasan ini juga memberikan manfaat nyata bagi masyarakat sekitar, mulai dari fungsi tata air, penyediaan jasa ekosistem, hingga nilai sosial budaya yang melekat.

Namun, kondisi Suaka Margasatwa Kelian Lestari tidak terlepas dari berbagai ancaman serius. Bekas aktivitas pertambangan emas yang pernah berlangsung di dalam kawasan meninggalkan kerusakan ekologis yang cukup besar, seperti lubang tambang terbuka, degradasi habitat, serta perubahan bentang alam. Dampak tersebut tidak hanya mengganggu fungsi ekologis kawasan, tetapi juga memicu kerentanan baru, seperti perambahan hutan, penambangan tanpa izin, hingga pembalakan liar. Selain itu, perburuan satwa liar menjadi ancaman lain yang mengikis keberadaan spesies kunci dan berpotensi menurunkan keanekaragaman hayati kawasan.

Meski demikian, berbagai upaya rehabilitasi yang dilakukan sejak tahun 1992 telah menunjukkan hasil yang positif. Program revegetasi, pengendalian aktivitas manusia, dan pemulihan ekosistem pascatambang mulai mengembalikan fungsi ekologis kawasan. Pulihnya vegetasi menjadi habitat baru bagi satwa liar serta mendukung kegiatan pelepasliaran satwa dilindungi yang telah beberapa kali dilakukan. Pelepasliaran tersebut menjadi bukti nyata bahwa kawasan ini berpotensi kembali menjadi habitat yang layak sekaligus menjadi model keberhasilan pemulihan kawasan konservasi.

Dengan melihat kondisi tersebut, perlindungan dan pengamanan kawasan Suaka Margasatwa Kelian Lestari perlu terus ditingkatkan. Ancaman yang masih ada harus dikelola dengan langkah strategis, sementara keberhasilan yang telah diraih harus dipertahankan dan dikembangkan. Melalui patroli rutin, pengawasan intensif, serta pemanfaatan teknologi seperti SMART Patrol, diharapkan kawasan ini tetap lestari dan mampu menjalankan fungsinya sebagai penyangga kehidupan serta warisan alam yang berharga bagi generasi yang akan datang.`);
  const [dasarHukum, setDasarHukum] = useState(`Sebagai acuan dalam pelaksaan dan dasar dari kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian adalah:

1. Undang-Undang Nomor 5 Tahun 1990 tentang Konservasi Sumber Daya Alam dan Ekosistemnya sebagaimana telah diubah dengan Undang-Undang Republik Indonesia Nomor 32 Tahun 2024 tentang Perubahan Atas Undang-Undang Nomor 5 Tahun 1990 tentang Konservasi Sumber Daya Alam dan Ekosistemnya;
2. Peraturan Pemerintah Nomor 28 Tahun 2011 tentang Pengelolaan Kawasan Suaka Alam Dan Kawasan Pelestarian Alam sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 108 Tahun 2015 tentang Perubahan Atas Peraturan Pemerintah Nomor 28 Tahun 2011 tentang Pengelolaan Kawasan Suaka Alam Dan Kawasan Pelestarian Alam;
3. Peraturan Pemerintah Nomor 23 Tahun 2021 tentang Penyelenggaraan Kehutanan;
4. Peraturan Presiden Nomor 77 Tahun 2018 Tentang Pengelalaan Dana Lingkungan Hidup;
5. Peraturan Presiden Nomor 98 Tahun 2021 tentang Penyelenggaraan Nilai Ekonomi Karbon Untuk Pencapaian Target Kontribusi Yang Ditetapkan Secara Nasional dan Pengendalian Emisi Gas Rumah Kaca Dalam Pembangunan Nasional;
6. Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah sebagaimana telah diubah dengan Peraturan Presiden Nomor 46 Tahun 2025 tentang Perubahan Kedua atas Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah;
7. Peraturan Presiden Nomor 175 Tahun 2024 tentang Kementerian Kehutanan;
8. Keputusan Menteri Lingkungan Hidup dan Kehutanan Republik Indonesia Nomor 940 Tahun 2024 tentang Rencana Investasi FOLU Net Sink 2030 melalui Dukungan Sumber Dana Kerja Sama Indonesia – Norwegia Tahap Kedua dan Ketiga yang Dikelola Oleh Badan Pengelola Dana Lingkungan Hidup;
9. Peraturan Menteri Kehutanan Nomor 1 Tahun 2024 tentang Organisasi dan Tata Kerja Kementerian Kehutanan;
10. Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem;
11. Keputusan Menteri Kehutanan Nomor 32 Tahun 2025 tentang Perubahan Atas Keputusan Menteri Lingkungan Hidup dan Kehutanan Nomor 234 Tahun 2024 tentang Penetapan Struktur Organisasi Operation Management Office Indonesia’s Forestry and Other Land Use (FOLU) Net Sink 2030;
12. Keputusan Menteri Kehutanan Nomor SK.194 Tahun 2025 tentang Perubahan Atas Keputusan Menteri Lingkungan Hidup dan Kehutanan Nomor SK.168/MENLHK/PKTL/PLA.1/2/2022 tentang Indonesia’s Forestry and Other Land Use (FOLU) Net Sink 2030 untuk Pengendalian Perubahan Iklim;
13. Keputusan Sekretaris Jenderal Kementerian Kehutanan Nomor 1 Tahun 2025 tentang Penetapan Implementing Partner Periode Kesatu FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia - Norwegia Tahap Kedua dan Ketiga yang Dikelola oleh Badan Pengelola Dana Lingkungan Hidup;
14. Keputusan Project Director FOLU NC 2&3 Tahun 2026 tentang Penetapan Tim Pelaksana Proyek Implementing Partner FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia - Norwegia Tahap Kedua dan Ketiga;
15. Keputusan Kepala Biro Perencanaan Kementerian Kehutanan Selaku Project Director FOLU NC 2&3 Nomor SK.30/ROCAN/PK/REN.02/6/2025 tentang Perubahan Atas Keputusan Kepala Biro Perencanaan Selaku Project Director FOLU NC 2&3 Nomor SK.ll/ROCAN/PK/REN.02/4/2025 tentang Pedoman Operasional Proyek Implementasi FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia - Norwegia Tahap Kedua dan Ketiga yang dikelola oleh Badan Pengelola Dana Lingkungan Hidup dengan Mekanisme Pengelolaan Dana Lingkungan Hidup;
16. Keputusan Sekretaris Direktorat Jenderal Konservasi Sumber Daya Alam Dan Ekosistem Selaku Koordinator Kegiatan Implementing Partner FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia Norwegia  Танар II Dan III Nomor: SK.2/KSDAE/FOLU.NC-23/I/2026 Tentang Penunjukan Personil Tim Pengelola Proyek Implementing Partner FOLU Net Sink 2030 Melalui Sumber Dana Kerja Sama Indonesia Norwegia Tahap II Dan III Yang Dikelola Oleh Badan Pengelola Dana Lingkungan Hidup;
17. Annual Work Plan (AWP) Tahun Anggaran 2026 Implementasi FOLU Net Sink 2030 melalui Dukungan Sumber Dana Kerja Sama Indonesia-Norwegia Tahap Kedua dan Ketiga Ditjen KSDAE;
18. Surat Surat Tugas dengan Nomor : ST.353/K.18/TU/FOLU.NC-23/KSA.02.01/B/04/2026 tanggal 23 April 2026 dalam rangka melaksanakan Smart Patrol/Patroli Perlindungan Kawasan Konservasi di Suaka Margasatwa Kelian, selama 8 (delapan) hari terhitung mulai tanggal 23 sampai dengan 30 April 2026.`);
  const [maksud, setMaksud] = useState(`Kegiatan SMART Patrol di Suaka Margasatwa (SM) Kelian dilaksanakan sebagai bagian dari strategi perlindungan kawasan konservasi dengan pendekatan patroli yang terukur, terstruktur, dan berbasis data. SMART Patrol mendukung pengelolaan kawasan secara efektif sekaligus memperkuat komitmen pelestarian keanekaragaman hayati.`);
  const [tujuan, setTujuan] = useState(`Tujuan pelaksanaan kegiatan ini mencakup:

1. Mengurangi dan mencegah ancaman terhadap kawasan, seperti perambahan, perburuan satwa liar, illegal logging, dan kebakaran hutan.
2. Mendukung konservasi satwa liar dan habitatnya melalui kegiatan monitoring lapangan yang berkelanjutan.
3. Menghasilkan data dan informasi lapangan yang sistematis sebagai landasan manajemen berbasis bukti (evidence-based management).
4. Meningkatkan kapasitas petugas serta memperkuat kolaborasi dengan masyarakat dan mitra dalam menjaga kawasan.
5. Menjaga keutuhan ekosistem hutan dan kelestarian keanekaragaman hayati yang menjadi inti dari fungsi konservasi.
6. Membangun kesadaran dan partisipasi publik melalui edukasi serta penyebarluasan informasi penting terkait perlindungan kawasan.

Dengan enam tujuan tersebut, SMART Patrol bukan hanya sarana pemantauan, melainkan juga instrumen pengelolaan adaptif yang menghubungkan data, aksi lapangan, serta dukungan masyarakat untuk memastikan keberlangsungan kawasan konservasi.`);
  const [penerimaManfaat, setPenerimaManfaat] = useState("Adapun penerima manfaat dari kegiatan ini yakni BKSDA Kalimantan Timur sebagai pengelola Kawasan Suaka Margasatwa Kelian Lestari, stakeholder, dan masyarakat sekitar kawasan.");
  const [output, setOutput] = useState("Output pelaksanaan kegiatan ini adalah tersedianya database sebagai dasar pengambilan keputusan berbasis bukti (evidence-based management) dan peningkatan kapasitas personil dan kolaborasi.");
  const [indikatorKinerja, setIndikatorKinerja] = useState("Indikator kinerja kegiatan ini adalah jumlah data perjumpaan satwa liar, ancaman, dan kondisi habitat yang dilaporkan.");
  const [satuanUkur, setSatuanUkur] = useState("Luas wilayah kawasan yang dipatroli dan dipantau dari kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian berupa hektar.");
  const [volume, setVolume] = useState("Volume kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian berupa luas kawasan yang terjaga sebesar 3000 hektar.");
  const [ruangLingkup, setRuangLingkup] = useState(`Adapun ruang lingkup kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian adalah : 

1. Wilayah Cakupan Patroli
a. Seluruh kawasan Suaka Margasatwa Kelian sesuai dengan batas administrasi yang telah ditetapkan

2. Frekuensi dan Pola Patroli
a. Patroli rutin dilakukan secara periodik (bulanan).
b. Pola patroli meliputi pemantauan kondisi habitat yang belum terpantau dalam grid.

3. Obyek Pemantauan
a. Ancaman terhadap kawasan: perambahan, penebangan liar, kebakaran hutan/lahan, aktivitas perburuan satwa liar, penambangan tanpa izin, dan bentuk gangguan lainnya.
b. Keanekaragaman hayati: perjumpaan satwa liar, tanda keberadaan satwa (jejak, sarang, suara, feses), dan kondisi vegetasi/habitat.
c. Sosial-ekonomi: aktivitas masyarakat sekitar yang berpotensi mempengaruhi kawasan (misalnya kegiatan berburu, meramu, atau membuka lahan)`);

  // === BAB II Metodologi ===
  const [waktuTempat, setWaktuTempat] = useState("Pelaksanaan kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian dilaksanakan selama 8 (delapan) hari yaitu Tanggal 10 Juli 2026 sampai dengan tanggal 17 Juli 2026.");
  const [pelaksanaKegiatan, setPelaksanaKegiatan] = useState("Kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian dilaksanakan oleh Tenaga Fungsional Polhut dan Tenaga Fungsional PEH. Selain itu patrol ini juga berkolaborasi dengan personil PT. HLKL.");
  const [alatBahan, setAlatBahan] = useState(`Bahan yang akan digunakan dalam pelaksanaan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian, antara lain:

1. Peta Kawasan Suaka Margasatwa Kelian

Sedangkan peralatan yang digunakan antara lain:

1. Mobil Patroli
2. Smartphone Android dengan Aplikasi SMART dan Avenza Maps
3. Buku catatan
4. Parang
5. Tali tambang
6. Obat P3K`);
  const [metodePelaksanaan, setMetodePelaksanaan] = useState(`Dalam pelaksanaan kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian menggunakan 3 (tiga) metode pendekatan, yaitu:

1. Obervasi lapangan/ Pemantauan langsung

Patroli dilaksanakan pada wilayah-wilayah yang berbatasan langsung dengan kawasan Suaka Margasatwa maupun pada area di luar batas yang berpotensi memberikan tekanan terhadap kawasan di masa mendatang. Kegiatan ini mencakup pemantauan kondisi kawasan serta aktivitas masyarakat, baik yang berada di sekitar maupun di dalam kawasan. Segala bentuk aktivitas yang berpotensi mengganggu kelestarian kawasan, seperti pembukaan lahan baru, pembangunan bangunan liar, pembangunan jalan, infrastruktur telekomunikasi, perhubungan, maupun aktivitas lain di dalam kawasan Suaka Margasatwa Kelian, didata dan didokumentasikan secara detail. Setiap temuan di lapangan dicatat posisi koordinatnya dengan menggunakan aplikasi Avenza Maps, kemudian diinput ke dalam aplikasi SMART Patrol melalui perangkat smartphone Android oleh petugas pelaksana patroli.

2. Penyadartahuan

Upaya perlindungan kawasan juga dilakukan melalui interaksi langsung dengan masyarakat yang bermukim di sekitar Suaka Margasatwa Kelian dan memanfaatkan kawasan untuk kegiatan ekonomi. Dalam proses ini, petugas memberikan sosialisasi mengenai pentingnya menjaga kawasan konservasi, sekaligus mengingatkan masyarakat agar menghentikan aktivitas yang melanggar aturan. Penjelasan mencakup potensi ancaman terhadap kelestarian kawasan serta sanksi hukum yang berlaku apabila terjadi pelanggaran. Selain memberikan pemahaman, kegiatan ini juga dimanfaatkan untuk memperoleh informasi yang lebih mendalam, baik mengenai pihak-pihak yang melakukan aktivitas di dalam kawasan maupun keterangan dari warga sekitar yang mengetahui hal tersebut

3. Penindakan

Langkah yang dilakukan adalah mengusir para pelaku yang terbukti menyalahgunakan pemanfaatan kawasan Suaka Margasatwa Kelian, serta mengambil tindakan tegas lainnya sesuai ketentuan peraturan perundang-undangan yang berlaku terhadap setiap bentuk pelanggaran di dalam kawasan konservasi tersebut.`);
  const [tahapanPelaksanaan, setTahapanPelaksanaan] = useState(`Tahapan pelaksanaan kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian adalah sebagai berikut:

1. Persiapan Patroli yang meliputi :
a. Waktu dan Penjadwalan patroli
b. Lokasi dan Cakupan Jarak/Luasan
c. Pelaksana
d. Informasi karaktristik jalur patroli
e. Peralatan dan logistik makanan
f. Koordinasi

2. Tally Sheet (Lembar Data), tallysheet menggunakan aplikasi Smart Patrol yang sudah di Instal ke dalam smartphone android.

3. Pelaksanaan Patroli dengan metode Jalan kaki dan menggunakan kendaraan.

4. Dokumentasi kegiatan patroli menggunakan kamera lapangan/ smartphone

5. Pasca Patroli: olah data dan Pelaporan
a. Mengolah data hasil patroli menggunakan perangkat lunak smart desktop.
b. Menyusun laporan tertulis hasil kegiatan patroli.`);

  // === BAB III, IV, V ===
  const [hasilPelaksanaanIntro, setHasilPelaksanaanIntro] = useState("Kegiatan patroli dan observasi di Kawasan Suaka Badak Kelian merupakan langkah esensial dalam upaya pengamanan dan perlindungan kawasan konservasi. Selain berfokus pada pencegahan ancaman keamanan, tim juga melakukan pemantauan komprehensif terhadap kondisi habitat, kelayakan fasilitas prarilis (kandang tangkap), serta inventarisasi keanekaragaman hayati ekosistem setempat. Dengan mengombinasikan metode patroli mandiri dengan berjalan kaki serta patroli berkendara bersama personel dari PT. HLKL dan lembaga Alert, tim berhasil mendata berbagai temuan lapangan secara sistematis berdasarkan kategori perlindungan kawasan.");
  const [temuanSatwaLiarIntro, setTemuanSatwaLiarIntro] = useState("Selama periode observasi lapangan yang berlangsung dari tanggal 11 hingga 16 Juli 2026, tim secara intensif melakukan penyisiran kawasan. Melalui upaya tersebut, tim berhasil menghimpun berbagai data observasi penting yang meliputi perjumpaan fauna, identifikasi flora, hingga pantauan integritas dan keamanan kawasan. Rincian data satwa liar yang teridentifikasi selama patroli disajikan pada tabel berikut:");
  const [temuanSatwaLiarTable, setTemuanSatwaLiarTable] = useState<TemuanSatwaLiarItem[]>([
    { id: '1', namaLokal: 'Elang', namaIlmiah: 'Accipitridae', tipeTemuan: 'Langsung' },
    { id: '2', namaLokal: 'Rusa', namaIlmiah: 'Deer', tipeTemuan: 'Langsung' },
    { id: '3', namaLokal: 'Burung Bubut', namaIlmiah: 'Centropus chalybeus', tipeTemuan: 'Langsung' },
    { id: '4', namaLokal: 'Burung Pucuk Ular', namaIlmiah: 'Anhinga melanogaster', tipeTemuan: 'Langsung' },
  ]);
  const [temuanSatwaLiarOutro, setTemuanSatwaLiarOutro] = useState("Berdasarkan hasil pengamatan visual di lapangan, seluruh satwa yang teridentifikasi masuk ke dalam kategori perjumpaan langsung (direct sighting). Tim mencatat temuan mamalia berupa Rusa (Deer) sebanyak 2 ekor, serta perjumpaan dengan satwa predator dari kelompok aves, yaitu Elang (Accipitridae). Selain itu, tim juga cukup sering berpapasan dengan jenis aves lainnya yang berhabitat di kawasan tersebut, khususnya Burung Bubut (Centropus chalybeus) dan Burung Pucuk Ular (Anhinga melanogaster).");
  
  const [statusKonservasiKawasan, setStatusKonservasiKawasan] = useState("Selain pengamatan fauna, tim turut mengidentifikasi keberadaan flora spesifik berupa vegetasi Bakong Hutan di sepanjang jalur penyisiran. Dari aspek evaluasi sarana kawasan, tim memantau kondisi pos jaga yang secara umum masih terawat dan tidak memerlukan tindak lanjut perbaikan dalam waktu dekat.");
  
  const [temuanAncaman, setTemuanAncaman] = useState(`Namun, dari segi keamanan, tim menemukan satu indikasi pelanggaran yang cukup serius terkait penggunaan kawasan di luar peruntukannya (ilegal) yang diduga dilakukan oleh 1 kelompok oknum. Merespons temuan tersebut, tim di lapangan telah mengambil langkah awal berupa pendokumentasian bukti secara menyeluruh dan memberikan rekomendasi tegas agar segera dilakukan penindakan atau tindak lanjut lebih lanjut oleh pihak berwenang.

Hasil pemantauan terbaru ini mengonfirmasi bahwa kawasan suaka masih mempertahankan fungsinya sebagai habitat yang vital bagi kelangsungan hidup berbagai satwa liar, terutama untuk kelompok aves dan mamalia. Akan tetapi, terdeteksinya aktivitas pelanggaran menjadi peringatan nyata akan adanya potensi ancaman terhadap keutuhan kawasan. Oleh karena itu, sangat direkomendasikan untuk meningkatkan intensitas pengawasan, mempercepat proses tindak lanjut pelanggaran, serta memperketat penjagaan secara kolaboratif demi memastikan kelestarian jangka panjang ekosistem kawasan tersebut.`);
  const [kesimpulan, setKesimpulan] = useState(`Hasil kegiatan Patroli Perlindungan Kawasan dan Observasi Lapangan yang dilaksanakan dari tanggal 11 Juli 2026 sampai dengan 16 Juli 2026 adalah sebagai berikut:

1. Selama kegiatan patroli, ditemukan adanya ancaman nyata berupa indikasi pelanggaran penggunaan kawasan secara ilegal (dugaan penambangan liar skala kecil). Hal ini dibuktikan dengan temuan jejak pembukaan lahan di sekitar sumber air, serta peralatan operasional berupa selang, mesin pompa air, dan kotak penyaring kayu (dulang) yang ditinggalkan oleh oknum.
2. Kawasan masih berfungsi dengan baik sebagai habitat alami yang mendukung kehidupan keanekaragaman hayati. Hal ini dibuktikan dengan perjumpaan langsung (direct sighting) dengan berbagai satwa liar, di antaranya Rusa (Deer), Elang (Accipitridae), Burung Bubut (Centropus chalybeus), dan Burung Pucuk Ular (Anhinga melanogaster), serta temuan vegetasi flora Bakong Hutan.
3. Observasi terhadap kesiapan fasilitas translokasi satwa terus dilakukan, salah satunya melalui peninjauan langsung secara spesifik di area yang akan dibangun sebagai paddock khusus untuk Badak Pari.
4. Sinergitas pengamanan kawasan berjalan dengan baik dan kolaboratif. Hal ini terlihat dari variasi metode pelaksanaan perlindungan melalui patroli mandiri, patroli gabungan bersama pihak PT. HLKL, hingga patroli edukatif yang turut melibatkan mahasiswa KKN.`);

  const [saran, setSaran] = useState(`1. Tindak lanjut penanganan pelanggaran kawasan

Diperlukan koordinasi yang lebih intensif dengan pihak berwenang terkait guna melakukan penindakan atau pembersihan lokasi. Langkah ini sangat krusial agar aktivitas ilegal tersebut tidak meluas dan merusak sumber air serta ekosistem di sekitarnya.

2. Peningkatan intensitas patroli dan penjagaan titik rawan

Berdasarkan temuan pelanggaran, disarankan untuk meningkatkan frekuensi patroli, baik secara mandiri maupun gabungan (bersama PT. HLKL). Penjagaan dan pengawasan yang lebih ketat harus diprioritaskan di titik-titik rawan, terutama di area yang terindikasi sering disusupi untuk aktivitas ilegal, demi menjamin kawasan tetap steril dari gangguan.

3. Pengawalan berkesinambungan infrastruktur Badak Pari

Diperlukan pemantauan dan pengawalan secara intensif terhadap lahan yang dipersiapkan untuk pembangunan paddock Badak Pari. Observasi harus terus dilakukan secara berkala untuk memastikan bahwa proses penyiapan fasilitas tersebut mematuhi prosedur konservasi, dan habitat di sekitarnya tetap layak, aman, serta terhindar dari dampak negatif perubahan rona lingkungan.`);
  
  const [penutup, setPenutup] = useState(`Kegiatan patroli dan observasi lapangan di Kawasan Suaka Margasatwa Padang Luwai dan Suaka Badak Kelian telah memberikan kontribusi nyata dalam upaya menjaga kelestarian dan keutuhan kawasan konservasi. Melalui pelaksanaan patroli yang intensif—baik secara mandiri maupun kolaboratif—tim berhasil mendata keanekaragaman hayati secara langsung, sekaligus mendeteksi secara dini potensi ancaman serius, seperti indikasi aktivitas penggunaan kawasan secara ilegal (penambangan liar). Data dan informasi faktual yang terkumpul dari kegiatan ini menjadi dasar krusial dalam menyusun strategi pengamanan, perlindungan, dan pengelolaan kawasan yang lebih responsif, adaptif, dan berkelanjutan.

Hasil pelaksanaan observasi ini juga membuktikan bahwa kegiatan pemantauan rutin mampu memberikan gambaran aktual mengenai kondisi ekosistem dan kelayakan habitat satwa liar, khususnya dalam masa persiapan fasilitas translokasi Badak Pari. Keberhasilan dan kelancaran pelaksanaan tugas perlindungan di lapangan ini tidak terlepas dari sinergi yang terbangun dengan sangat baik antara tim patroli, pihak PT. Hutan Lindung Kelian Lestari (PT. HLKL), serta dukungan elemen akademisi (mahasiswa KKN) yang turut berpartisipasi dalam pengenalan dan pemantauan kawasan.

Kolaborasi multipihak ini merupakan modal dasar yang sangat penting dalam upaya menjaga kelestarian Suaka Margasatwa Padang Luwai dan Suaka Badak Kelian. Dengan komitmen bersama dan kerja sama yang solid, diharapkan kawasan konservasi ini dapat terus dipertahankan fungsinya agar senantiasa menjadi habitat yang aman bagi kelangsungan hidup satwa liar, serta mampu menjadi penyangga keseimbangan ekosistem yang lestari di masa mendatang.`);

  // === Lampiran ===
  const [tallySheetFile, setTallySheetFile] = useState<File | null>(null);
  const [sptFile, setSptFile] = useState<File | null>(null);
  const [dokumentasiFiles, setDokumentasiFiles] = useState<File[]>([]);

  // Fetch ST specifically filtered by "patrol"
  const fetchMySuratTugas = useCallback(async () => {
    setLoadingST(true);
    try {
      const resp = await api.get("/surat-tugas/my", { params: { per_page: 100 } });
      const dataArray = resp.data?.data || resp.data;
      if (Array.isArray(dataArray)) {
        const filtered = dataArray.filter((st: any) => 
          st.maksud_tujuan?.toLowerCase().includes("patrol") || 
          st.nomor_surat?.toLowerCase().includes("patrol")
        );
        setStOptions(filtered);
      }
    } catch (err) {
      console.error("Gagal mengambil Surat Tugas:", err);
    } finally {
      setLoadingST(false);
    }
  }, []);

  useEffect(() => {
    fetchMySuratTugas();
  }, [fetchMySuratTugas]);

  // Autofill fields when ST changes
  useEffect(() => {
    if (selectedSTId) {
      const st = stOptions.find(o => o.id === selectedSTId);
      if (st) {
        setNamaKegiatan(st.maksud_tujuan);
        
        if (st.employees && st.employees.length > 0) {
          const jabatanList = Array.from(new Set(st.employees.map(e => e.jabatan).filter(Boolean)));
          let jabatanStr = "Tenaga Fungsional Polhut dan Tenaga Fungsional PEH";
          
          if (jabatanList.length === 1) {
            jabatanStr = jabatanList[0];
          } else if (jabatanList.length > 1) {
            const last = jabatanList.pop();
            jabatanStr = jabatanList.join(", ") + " dan " + last;
          }
          
          setPelaksanaKegiatan(`Kegiatan Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian dilaksanakan oleh ${jabatanStr}. Selain itu patrol ini juga berkolaborasi dengan personil PT. HLKL.`);
        }
      }
    }
  }, [selectedSTId, stOptions]);

  const handleCustomCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCustomCoverFile(file);
      setCustomCoverPreview(URL.createObjectURL(file));
      setCoverMode("custom");
    }
  };

  const [isPrintMode, setIsPrintMode] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef({ edit: 0, print: 0 });

  const handleDokumentasiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setDokumentasiFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleToggleMode = () => {
    if (scrollContainerRef.current) {
      if (isPrintMode) {
        scrollPositions.current.print = scrollContainerRef.current.scrollTop;
      } else {
        scrollPositions.current.edit = scrollContainerRef.current.scrollTop;
      }
    }
    
    setIsPrintMode(!isPrintMode);

    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = !isPrintMode 
          ? scrollPositions.current.print 
          : scrollPositions.current.edit;
      }
    }, 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const reportData: SmartPatrolReportData = {
    coverMode,
    customCoverPreview,
    namaKegiatan,
    sumberDana,
    tanggal,
    dinilaiOleh,
    disusunOleh,
    kataPengantar,
    daftarIsi,
    daftarLampiran,
    latarBelakang,
    dasarHukum,
    maksud,
    tujuan,
    penerimaManfaat,
    output,
    indikatorKinerja,
    satuanUkur,
    volume,
    ruangLingkup,
    waktuTempat,
    pelaksanaKegiatan,
    pelaksanaEmployees: stOptions.find((o) => o.id === selectedSTId)?.employees,
    alatBahan,
    metodePelaksanaan,
    tahapanPelaksanaan,
    hasilPelaksanaanIntro,
    temuanSatwaLiarIntro,
    temuanSatwaLiarTable,
    temuanSatwaLiarOutro,
    statusKonservasiKawasan,
    temuanAncaman,
    kesimpulan,
    saran,
    penutup,
    dokumentasiPreviews: dokumentasiFiles.map((f) => URL.createObjectURL(f)),
    tallySheetName: tallySheetFile?.name,
    sptName: sptFile?.name,
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-blue-50/50 dark:bg-blue-900/10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-10 h-10 rounded-full hover:bg-white dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Form Laporan SMART PATROL
              </h2>
              <p className="text-xs text-slate-500 font-medium">Isi data form patroli kawasan.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleToggleMode}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 shadow-sm"
          >
            {isPrintMode ? (
              <>
                <Layers className="w-4 h-4" />
                Mode Form Edit
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                Pratinjau CETAK PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth">
        {isPrintMode ? (
          /* PRINT PREVIEW MODE */
          <div className="p-6 space-y-6 print:p-0 print:m-0 print:space-y-0">
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-4 rounded-2xl print:hidden">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Pratinjau Format Resmi Laporan SMART PATROL BKSDA Kaltim
                </span>
              </div>
              <Button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 rounded-xl shadow-md gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Cetak Dokumen Sekarang
              </Button>
            </div>

            <div className="border rounded-2xl p-6 bg-gray-50 overflow-x-auto shadow-inner print:p-0 print:border-none print:bg-transparent print:shadow-none print:m-0 print:overflow-visible">
              <SmartPatrolPrint data={reportData} tallySheetFile={tallySheetFile} />
            </div>
          </div>
        ) : (
          /* FORM EDIT MODE */
          <div className="p-6 scroll-smooth">
            <div className="max-w-4xl mx-auto space-y-8 pb-20">
              
              {/* SECTION: SURAT TUGAS */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Label className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
                  Pilih Surat Tugas (Hanya Patroli)
                </Label>
            
            {loadingST ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Memuat Surat Tugas...
              </div>
            ) : (
              <Popover open={stPopoverOpen} onOpenChange={setStPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between bg-white dark:bg-slate-900 h-auto py-3 px-4 border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex flex-col items-start gap-1 text-left truncate pr-4">
                      {selectedSTId ? (
                        <>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate w-full">
                            {stOptions.find((st) => st.id === selectedSTId)?.nomor_surat || "[ Tanpa Nomor ST ]"}
                          </span>
                          <span className="text-xs text-slate-500 font-normal truncate w-full">
                            {stOptions.find((st) => st.id === selectedSTId)?.maksud_tujuan}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-normal text-sm">Pilih Surat Tugas...</span>
                      )}
                    </div>
                    <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[800px] p-0" align="start">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-800 relative">
                    <Search className="w-4 h-4 absolute left-6 top-6 text-slate-400" />
                    <Input 
                      placeholder="Cari ST..." 
                      value={stSearch}
                      onChange={(e) => setStSearch(e.target.value)}
                      className="pl-9 bg-slate-50 dark:bg-slate-800/50"
                    />
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    {stOptions
                      .filter(st => 
                        st.nomor_surat?.toLowerCase().includes(stSearch.toLowerCase()) || 
                        st.maksud_tujuan.toLowerCase().includes(stSearch.toLowerCase())
                      )
                      .map((st) => (
                      <div
                        key={st.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors mb-1",
                          selectedSTId === st.id ? "bg-blue-50 dark:bg-blue-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                        onClick={() => {
                          setSelectedSTId(st.id);
                          setStPopoverOpen(false);
                          setStSearch("");
                        }}
                      >
                        <Check className={cn("w-4 h-4 mt-0.5 shrink-0 text-blue-600", selectedSTId === st.id ? "opacity-100" : "opacity-0")} />
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{st.nomor_surat}</p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{st.maksud_tujuan}</p>
                        </div>
                      </div>
                    ))}
                    {stOptions.filter(st => st.nomor_surat?.toLowerCase().includes(stSearch.toLowerCase()) || st.maksud_tujuan.toLowerCase().includes(stSearch.toLowerCase())).length === 0 && (
                      <p className="p-4 text-center text-sm text-slate-500">Tidak ada ST yang cocok.</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* SECTION I: UPLOAD COVER */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">i. Cover Laporan</h3>
            <div className="flex gap-4">
              <Button
                variant={coverMode === "standard" ? "default" : "outline"}
                className={cn("flex-1", coverMode === "standard" && "bg-blue-600 hover:bg-blue-700")}
                onClick={() => setCoverMode("standard")}
              >
                Cover Standar BKSDA
              </Button>
              <Button
                variant={coverMode === "custom" ? "default" : "outline"}
                className={cn("flex-1", coverMode === "custom" && "bg-blue-600 hover:bg-blue-700")}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = handleCustomCoverChange as any;
                  input.click();
                }}
              >
                Upload Cover Kustom
              </Button>
            </div>
            {coverMode === "custom" && customCoverPreview && (
              <div className="mt-4 relative rounded-xl overflow-hidden border border-slate-200 inline-block">
                <img src={customCoverPreview} alt="Cover Preview" className="h-64 object-cover" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full"
                  onClick={() => { setCustomCoverFile(null); setCustomCoverPreview(""); setCoverMode("standard"); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* SECTION II: INFORMASI DASAR */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">ii. Informasi Dasar</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nama Kegiatan</Label>
                <Input value={namaKegiatan} onChange={(e) => setNamaKegiatan(e.target.value)} placeholder="Contoh: SMART PATROL..." />
              </div>

              <div className="space-y-1.5">
                <Label>Sumber Dana</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus:ring-slate-300"
                  value={sumberDana}
                  onChange={(e) => setSumberDana(e.target.value)}
                >
                  <option value="">-- Pilih Sumber Dana --</option>
                  <option value="ANGGARAN PROYEK FOLU NET SINK 2030 RBC NORWEGIA TAHAP II DAN III (FOLU NC 2&3) PADA AWP KSDAE – TAHUN ANGGARAN 2026">
                    ANGGARAN PROYEK FOLU NET SINK 2030 RBC NORWEGIA TAHAP II DAN III (FOLU NC 2&3) PADA AWP KSDAE – TAHUN ANGGARAN 2026
                  </option>
                  <option value="Sumber Dana 2">[ Opsi Lain 1 ]</option>
                  <option value="Sumber Dana 3">[ Opsi Lain 2 ]</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Tanggal Laporan</Label>
                  <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Dinilai Oleh</Label>
                  <Input value={dinilaiOleh} onChange={(e) => setDinilaiOleh(e.target.value)} placeholder="Nama Penilai..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Disusun Oleh</Label>
                  <Input value={disusunOleh} onChange={(e) => setDisusunOleh(e.target.value)} placeholder="Nama Penyusun..." />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* SECTION III - V */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">iii. Kata Pengantar</h3>
              <Textarea value={kataPengantar} onChange={(e) => setKataPengantar(e.target.value)} placeholder="Teks Kata Pengantar..." className="min-h-[300px]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">iv. Daftar Isi</h3>
              <Textarea value={daftarIsi} onChange={(e) => setDaftarIsi(e.target.value)} placeholder="Daftar Isi (opsional untuk versi draft)..." className="min-h-[150px]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">v. Daftar Lampiran</h3>
              <Textarea value={daftarLampiran} onChange={(e) => setDaftarLampiran(e.target.value)} placeholder="Daftar Lampiran..." className="min-h-[150px]" />
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* BAB I */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">BAB I PENDAHULUAN</h3>
            <div className="space-y-6">
              <div className="space-y-1.5"><Label>A. Latar Belakang</Label><Textarea value={latarBelakang} onChange={(e) => setLatarBelakang(e.target.value)} className="min-h-[250px]" /></div>
              <div className="space-y-1.5"><Label>B. Dasar Hukum</Label><Textarea value={dasarHukum} onChange={(e) => setDasarHukum(e.target.value)} className="min-h-[150px]" /></div>
              <div className="space-y-1.5"><Label>C. Maksud</Label><Textarea value={maksud} onChange={(e) => setMaksud(e.target.value)} className="min-h-[150px]" /></div>
              <div className="space-y-1.5"><Label>Tujuan</Label><Textarea value={tujuan} onChange={(e) => setTujuan(e.target.value)} className="min-h-[250px]" /></div>
              <div className="space-y-1.5"><Label>D. Penerima Manfaat/Sasaran</Label><Textarea value={penerimaManfaat} onChange={(e) => setPenerimaManfaat(e.target.value)} className="min-h-[150px]" /></div>
              <div className="space-y-1.5"><Label>E. Output</Label><Textarea value={output} onChange={(e) => setOutput(e.target.value)} className="min-h-[150px]" /></div>
              <div className="space-y-1.5"><Label>F. Indikator Kinerja Kegiatan</Label><Textarea value={indikatorKinerja} onChange={(e) => setIndikatorKinerja(e.target.value)} className="min-h-[150px]" /></div>
              <div className="space-y-1.5"><Label>G. Satuan Ukur</Label><Textarea value={satuanUkur} onChange={(e) => setSatuanUkur(e.target.value)} className="min-h-[150px]" /></div>
              <div className="space-y-1.5"><Label>H. Volume</Label><Textarea value={volume} onChange={(e) => setVolume(e.target.value)} className="min-h-[150px]" /></div>
              <div className="space-y-1.5"><Label>I. Ruang Lingkup</Label><Textarea value={ruangLingkup} onChange={(e) => setRuangLingkup(e.target.value)} className="min-h-[150px]" /></div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* BAB II */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">BAB II METODOLOGI</h3>
            <div className="space-y-6">
              <div className="space-y-1.5"><Label>A. Waktu dan Tempat</Label><Textarea value={waktuTempat} onChange={(e) => setWaktuTempat(e.target.value)} className="min-h-[150px]" /></div>
              <div className="space-y-1.5">
                <Label>B. Pelaksana Kegiatan</Label>
                <Textarea value={pelaksanaKegiatan} onChange={(e) => setPelaksanaKegiatan(e.target.value)} className="min-h-[150px]" />
                
                {reportData.pelaksanaEmployees && reportData.pelaksanaEmployees.length > 0 && (
                  <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-sm font-semibold border-b border-slate-200 dark:border-slate-800">
                      Preview Tabel Tim Patroli (Otomatis dari ST)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <tr>
                            <th className="px-4 py-2 font-medium w-12 text-center">No</th>
                            <th className="px-4 py-2 font-medium">Nama</th>
                            <th className="px-4 py-2 font-medium">NIP</th>
                            <th className="px-4 py-2 font-medium">Jabatan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {reportData.pelaksanaEmployees.map((emp, idx) => (
                            <tr key={emp.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="px-4 py-2 text-center">{idx + 1}.</td>
                              <td className="px-4 py-2 font-medium">{emp.nama_lengkap}</td>
                              <td className="px-4 py-2 text-slate-500">{emp.nip}</td>
                              <td className="px-4 py-2 text-slate-500">{emp.jabatan}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1.5"><Label>C. Alat dan Bahan</Label><Textarea value={alatBahan} onChange={(e) => setAlatBahan(e.target.value)} className="min-h-[150px]" /></div>
              <div className="space-y-1.5"><Label>D. Metode Pelaksanaan</Label><Textarea value={metodePelaksanaan} onChange={(e) => setMetodePelaksanaan(e.target.value)} className="min-h-[150px]" /></div>
              <div className="space-y-1.5"><Label>E. Tahapan Pelaksanaan Kegiatan</Label><Textarea value={tahapanPelaksanaan} onChange={(e) => setTahapanPelaksanaan(e.target.value)} className="min-h-[250px]" /></div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* BAB III, IV, V */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">BAB III HASIL KEGIATAN</h3>
              <div className="space-y-4 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <h4 className="font-bold text-lg">A. Hasil Pelaksanaan</h4>
                <div className="space-y-1.5">
                  <Label>Pengantar Hasil Pelaksanaan</Label>
                  <Textarea value={hasilPelaksanaanIntro} onChange={(e) => setHasilPelaksanaanIntro(e.target.value)} className="min-h-[150px]" />
                </div>
                
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h5 className="font-bold">1. Temuan Satwa Liar</h5>
                  <div className="space-y-1.5">
                    <Label>Pengantar Temuan Satwa Liar</Label>
                    <Textarea value={temuanSatwaLiarIntro} onChange={(e) => setTemuanSatwaLiarIntro(e.target.value)} className="min-h-[100px]" />
                  </div>
                  
                  <div className="space-y-2 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <Label>Tabel 1. Data Satwa Liar</Label>
                      <Button type="button" size="sm" variant="outline" onClick={() => setTemuanSatwaLiarTable([...temuanSatwaLiarTable, { id: Date.now().toString(), namaLokal: '', namaIlmiah: '', tipeTemuan: 'Langsung' }])}>
                        <Plus className="w-4 h-4 mr-1" /> Tambah Baris
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {temuanSatwaLiarTable.map((item, idx) => (
                        <div key={item.id} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                          <span className="text-sm font-bold w-6 text-center">{idx + 1}.</span>
                          <Input placeholder="Nama Lokal" value={item.namaLokal} onChange={(e) => {
                            const newTable = [...temuanSatwaLiarTable];
                            newTable[idx].namaLokal = e.target.value;
                            setTemuanSatwaLiarTable(newTable);
                          }} className="flex-1" />
                          <Input placeholder="Nama Ilmiah" value={item.namaIlmiah} onChange={(e) => {
                            const newTable = [...temuanSatwaLiarTable];
                            newTable[idx].namaIlmiah = e.target.value;
                            setTemuanSatwaLiarTable(newTable);
                          }} className="flex-1" />
                          <select className="flex h-10 w-36 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" value={item.tipeTemuan} onChange={(e) => {
                            const newTable = [...temuanSatwaLiarTable];
                            newTable[idx].tipeTemuan = e.target.value as any;
                            setTemuanSatwaLiarTable(newTable);
                          }}>
                            <option value="Langsung">Langsung</option>
                            <option value="Tidak Langsung">Tidak Langsung</option>
                          </select>
                          <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" onClick={() => {
                            setTemuanSatwaLiarTable(temuanSatwaLiarTable.filter((_, i) => i !== idx));
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label>Penutup Temuan Satwa Liar</Label>
                    <Textarea value={temuanSatwaLiarOutro} onChange={(e) => setTemuanSatwaLiarOutro(e.target.value)} className="min-h-[100px]" />
                  </div>
                </div>
                
                <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h5 className="font-bold pb-1">2. Status Konservasi Kawasan</h5>
                  <Textarea value={statusKonservasiKawasan} onChange={(e) => setStatusKonservasiKawasan(e.target.value)} className="min-h-[100px]" />
                </div>
                
                <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h5 className="font-bold pb-1">3. Temuan Ancaman</h5>
                  <Textarea value={temuanAncaman} onChange={(e) => setTemuanAncaman(e.target.value)} className="min-h-[150px]" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">BAB IV SIMPULAN DAN SARAN</h3>
              <div className="space-y-4 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-lg">A. Kesimpulan</h4>
                  <Textarea value={kesimpulan} onChange={(e) => setKesimpulan(e.target.value)} className="min-h-[250px]" />
                </div>
                <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-lg">B. Saran/Rekomendasi</h4>
                  <Textarea value={saran} onChange={(e) => setSaran(e.target.value)} className="min-h-[250px]" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">BAB V PENUTUP</h3>
              <Textarea value={penutup} onChange={(e) => setPenutup(e.target.value)} className="min-h-[200px]" />
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* LAMPIRAN */}
          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase bg-slate-100 dark:bg-slate-800 inline-block px-4 py-1.5 rounded-lg">LAMPIRAN</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>1. TALLY SHEET</Label>
                <div className="flex gap-2">
                  <Input type="file" onChange={(e) => { if (e.target.files) setTallySheetFile(e.target.files[0]) }} />
                  {tallySheetFile && <Button variant="destructive" size="icon" onClick={() => setTallySheetFile(null)}><Trash2 className="w-4 h-4" /></Button>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>2. SURAT PERINTAH TUGAS (SPT)</Label>
                <div className="flex gap-2">
                  <Input type="file" onChange={(e) => { if (e.target.files) setSptFile(e.target.files[0]) }} />
                  {sptFile && <Button variant="destructive" size="icon" onClick={() => setSptFile(null)}><Trash2 className="w-4 h-4" /></Button>}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>3. Dokumentasi Kegiatan Patroli</Label>
                <div className="flex gap-2">
                  <Input type="file" multiple accept="image/*" onChange={handleDokumentasiChange} />
                </div>
                {dokumentasiFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {dokumentasiFiles.map((file, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200">
                        <img src={URL.createObjectURL(file)} alt="Dok" className="w-20 h-20 object-cover" />
                        <Button 
                          variant="destructive" size="icon" 
                          className="absolute top-1 right-1 w-6 h-6 rounded-full"
                          onClick={() => setDokumentasiFiles(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  </div>
);
}
