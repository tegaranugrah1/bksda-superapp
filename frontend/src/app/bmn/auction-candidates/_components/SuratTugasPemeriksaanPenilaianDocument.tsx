"use client";

import type { AuctionAsset } from "../_lib/auction-helpers";
import { formatDateLong } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";

interface PersonLike {
  nama?: string | null;
  nip?: string | null;
  jabatan?: string | null;
}

interface SuratTugasPemeriksaanPenilaianDocumentProps {
  number: string;
  kap: string;
  assets: AuctionAsset[];
  kepalaBalai: SkKepalaBalai;
  timPenilai: PersonLike[];
  pemeriksa: PersonLike[];
}

function buildNomor(number: string, kap: string, today: Date) {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `ST.${(number || "").trim() || "____"}/K.18/TU/${kap.trim() || "KAP.06.01"}/B/${month}/${today.getFullYear()}`;
}

export function SuratTugasPemeriksaanPenilaianDocument({
  number,
  kap,
  assets,
  kepalaBalai,
  timPenilai,
  pemeriksa,
}: SuratTugasPemeriksaanPenilaianDocumentProps) {
  const today = new Date();
  const nomorText = buildNomor(number, kap, today);
  const petugas = [...timPenilai, ...pemeriksa].filter((person) => person?.nama || person?.nip || person?.jabatan);

  return (
    <div className="surat-tugas-pemeriksaan-penilaian-print-root">
      <style jsx global>{`
        .surat-tugas-page { font-family: 'Bookman Old Style', Georgia, serif; font-size: 11pt; line-height: 1.4; color: #000; }
        .surat-tugas-page p { margin: 0; }
        .surat-tugas-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; font-size: 10pt; }
        .surat-tugas-table th, .surat-tugas-table td { border: 1px solid #000; padding: 5px 6px; vertical-align: top; }
        .surat-tugas-table th { text-align: center; font-weight: 700; }
        .surat-tugas-edit { outline: none; border-bottom: 1px dashed transparent; }
        .surat-tugas-edit:hover { border-bottom-color: #94a3b8; }
      `}</style>

      <article className="doc-page surat-tugas-page bg-white text-black">
        <div className="doc-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-terbaru.png" alt="Kop Surat" />
        </div>

        <div className="doc-body">
          <div className="doc-title">
            <p>SURAT TUGAS</p>
            <p>Nomor : {nomorText}</p>
          </div>

          <div className="doc-text-block">
            <p contentEditable suppressContentEditableWarning className="surat-tugas-edit">
              Dalam rangka pemeriksaan fisik dan penilaian Barang Milik Negara berupa alat angkutan bermotor pada Balai Konservasi Sumber Daya Alam Kalimantan Timur, dengan ini menugaskan kepada:
            </p>

            <table className="surat-tugas-table">
              <thead>
                <tr>
                  <th style={{ width: "10mm" }}>No</th>
                  <th>Nama / NIP</th>
                  <th>Jabatan</th>
                </tr>
              </thead>
              <tbody>
                {(petugas.length > 0 ? petugas : [{ nama: "________________", nip: "", jabatan: "________________" }]).map((person, index) => (
                  <tr key={`${person.nama || "person"}-${index}`}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td>
                      <strong>{person.nama || "________________"}</strong>
                      {person.nip && <div>NIP. {person.nip}</div>}
                    </td>
                    <td>{person.jabatan || "________________"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p contentEditable suppressContentEditableWarning className="surat-tugas-edit">
              Untuk melaksanakan pemeriksaan, penelitian administrasi, dan penilaian kewajaran nilai taksiran atas objek BMN yang akan dipindahtangankan melalui penjualan secara lelang.
            </p>

            <table className="surat-tugas-table">
              <thead>
                <tr>
                  <th style={{ width: "10mm" }}>No</th>
                  <th>Nama Barang</th>
                  <th>Kode Barang</th>
                  <th>NUP</th>
                  <th>No Polisi</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset, index) => (
                  <tr key={asset.id || `${asset.kode_barang}-${asset.nup}-${index}`}>
                    <td style={{ textAlign: "center" }}>{index + 1}</td>
                    <td>{asset.nama_barang}</td>
                    <td>{asset.kode_barang}</td>
                    <td>{asset.nup}</td>
                    <td>{asset.no_polisi || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p contentEditable suppressContentEditableWarning className="surat-tugas-edit">
              Surat tugas ini berlaku sejak tanggal ditetapkan sampai dengan selesainya kegiatan pemeriksaan dan penilaian BMN dimaksud.
            </p>
          </div>

          <div className="signature">
            <p>Samarinda, {formatDateLong(today)}</p>
            <p>Kepala Balai,</p>
            <div className="ttd-placeholder">TTD</div>
            <p style={{ fontWeight: 700, textDecoration: "underline" }}>{kepalaBalai.nama || "________________"}</p>
            {kepalaBalai.nip && <p>NIP. {kepalaBalai.nip}</p>}
          </div>
        </div>
      </article>
    </div>
  );
}
