"use client";

import type { AuctionAsset } from "../_lib/auction-helpers";
import { formatPlainRupiah } from "../_lib/auction-helpers";
import type { SkKepalaBalai } from "../_lib/sk-defaults";

interface AssetLampiranLandscapeTableProps {
  assets: AuctionAsset[];
  nomor: string;
  tanggal: string;
  perihalLampiran: string;
  kepalaBalai: SkKepalaBalai;
  /**
   * Optional CSS prefix to scope styles when used inside multiple documents
   * on the same page (e.g. "nd-" / "pkpknl-").
   */
  prefix: string;
}

interface LampiranPage {
  assets: AuctionAsset[];
  startIndex: number;
  includeMeta: boolean;
  includeTotal: boolean;
  includeSignature: boolean;
}

function buildLampiranPages(assets: AuctionAsset[]): LampiranPage[] {
  const firstPageLimit = 8;
  const continuationPageLimit = 10;
  const lastPageLimit = 4;
  const pages: LampiranPage[] = [];

  const pushPage = (pageAssets: AuctionAsset[], startIndex: number, includeMeta: boolean) => {
    pages.push({
      assets: pageAssets,
      startIndex,
      includeMeta,
      includeTotal: false,
      includeSignature: false,
    });
  };

  if (assets.length <= firstPageLimit) {
    pushPage(assets, 0, true);
  } else {
    const firstChunkSize = firstPageLimit;
    const remainingAfterFirst = Math.max(0, assets.length - firstChunkSize);
    const lastPageOptions = Array.from(
      { length: Math.min(lastPageLimit, remainingAfterFirst) },
      (_, index) => index + 1,
    );
    const [safeLastPageSize] = lastPageOptions.sort((a, b) => {
      const middleA = remainingAfterFirst - a;
      const middleB = remainingAfterFirst - b;
      const middlePagesA = Math.ceil(middleA / continuationPageLimit);
      const middlePagesB = Math.ceil(middleB / continuationPageLimit);
      const totalPagesA = middlePagesA + 1;
      const totalPagesB = middlePagesB + 1;
      const lastMiddleChunkA = middleA > 0 ? middleA % continuationPageLimit || continuationPageLimit : 0;
      const lastMiddleChunkB = middleB > 0 ? middleB % continuationPageLimit || continuationPageLimit : 0;
      const hasSingleMiddleA = lastMiddleChunkA === 1;
      const hasSingleMiddleB = lastMiddleChunkB === 1;

      if (totalPagesA !== totalPagesB) return totalPagesA - totalPagesB;
      if (hasSingleMiddleA !== hasSingleMiddleB) return hasSingleMiddleA ? 1 : -1;
      return a - b;
    });
    const lastStartIndex = assets.length - safeLastPageSize;
    const middleCount = lastStartIndex - firstChunkSize;

    pushPage(assets.slice(0, firstChunkSize), 0, true);

    if (middleCount > 0) {
      let cursor = firstChunkSize;
      let remainingMiddle = middleCount;

      while (remainingMiddle > 0) {
        let pageSize = Math.min(continuationPageLimit, remainingMiddle);

        if (remainingMiddle > 1 && remainingMiddle - pageSize === 1) {
          pageSize -= 1;
        }

        pushPage(assets.slice(cursor, cursor + pageSize), cursor, false);
        cursor += pageSize;
        remainingMiddle -= pageSize;
      }
    }

    pushPage(assets.slice(lastStartIndex), lastStartIndex, false);
  }

  if (pages.length === 0) {
    pushPage([], 0, true);
  }

  const lastPage = pages[pages.length - 1];
  lastPage.includeTotal = true;
  lastPage.includeSignature = true;

  return pages;
}

/**
 * Shared landscape lampiran table (10-column DAFTAR BARANG MILIK NEGARA).
 * Used by NotaDinasDocument & PermohonanKpknlDocument.
 *
 * Notes:
 * - All cells are `contentEditable` so user can fill in nilai taksiran per
 *   asset and tweak any field before printing.
 * - Total nilai_perolehan is auto-summed; total nilai_taksiran is left blank
 *   (manual sum in italic) since it depends on user-entered taksiran.
 */
export function AssetLampiranLandscapeTable({
  assets,
  nomor,
  tanggal,
  perihalLampiran,
  kepalaBalai,
  prefix,
}: AssetLampiranLandscapeTableProps) {
  const totalPerolehan = assets.reduce(
    (sum, a) => sum + (a.nilai_perolehan || 0),
    0,
  );
  const pages = buildLampiranPages(assets);

  const renderMetaTitle = () => (
    <>
      <div className={`${prefix}lamp-meta`}>
        <p className={`${prefix}lamp-meta-lampiran`}>
          Lampiran <span contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`}>{perihalLampiran}</span>
        </p>
        <div className={`${prefix}lamp-meta-row`}>
          <span>Nomor</span>
          <span className={`${prefix}lamp-colon`}>:</span>
          <span contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`}>
            {nomor}
          </span>
        </div>
        <div className={`${prefix}lamp-meta-row`}>
          <span>Tanggal</span>
          <span className={`${prefix}lamp-colon`}>:</span>
          <span contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`}>
            {tanggal}
          </span>
        </div>
      </div>

      <div className={`${prefix}lamp-title`}>
        <p>DAFTAR BARANG MILIK NEGARA</p>
        <p>PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</p>
      </div>
    </>
  );

  const renderTable = (page: LampiranPage) => (
      <table className={`${prefix}lamp-table`}>
        <colgroup>
          <col style={{ width: "4%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "5%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "7%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "13%" }} />
        </colgroup>
        <thead>
          {!page.includeMeta && (
            <tr className={`${prefix}lamp-column-number-row`}>
              <th>1</th>
              <th>2</th>
              <th>3</th>
              <th>4</th>
              <th>5</th>
              <th>6</th>
              <th>7</th>
              <th>8</th>
              <th>9</th>
              <th>10</th>
              <th>11</th>
            </tr>
          )}
          <tr>
            <th>No</th>
            <th>Kode Barang</th>
            <th>NUP</th>
            <th>Nama Barang</th>
            <th>Merk / Type</th>
            <th>No Polisi</th>
            <th style={{ wordBreak: "normal", overflowWrap: "normal" }}>Tahun Perolehan</th>
            <th style={{ wordBreak: "normal", overflowWrap: "normal" }}>Nilai Perolehan (Rp)</th>
            <th style={{ wordBreak: "normal", overflowWrap: "normal" }}>Nilai Taksiran (Rp)</th>
            <th>Kondisi</th>
            <th style={{ wordBreak: "normal", overflowWrap: "normal" }}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {page.assets.length === 0 ? (
            <tr>
              <td colSpan={11} style={{ padding: "12px", color: "#94a3b8", textAlign: "center" }}>
                Belum ada aset terpilih.
              </td>
            </tr>
          ) : (
            page.assets.map((asset, index) => (
              <tr key={asset.id}>
                <td>{page.startIndex + index + 1}</td>
                <td contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`} style={{ whiteSpace: "nowrap", wordBreak: "keep-all", overflowWrap: "normal" }}>
                  {asset.kode_barang}
                </td>
                <td contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`}>
                  {asset.nup}
                </td>
                <td contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`} style={{ textAlign: "left" }}>
                  {asset.nama_barang}
                </td>
                <td contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`} style={{ textAlign: "left" }}>
                  {asset.merk_tipe || ""}
                </td>
                <td contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`}>
                  {asset.no_polisi || ""}
                </td>
                <td contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`} style={{ whiteSpace: "nowrap" }}>
                  {asset.tahun_perolehan ?? ""}
                </td>
                <td contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`} style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {asset.nilai_perolehan ? formatPlainRupiah(asset.nilai_perolehan) : ""}
                </td>
                <td contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`} style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {/* user fills in */}
                </td>
                <td contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`}>
                  {asset.kondisi}
                </td>
                <td contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`}>
                  {/* keterangan */}
                </td>
              </tr>
            ))
          )}
          {page.includeTotal && assets.length > 0 && (
            <tr className={`${prefix}lamp-jumlah-row`}>
              <td colSpan={7} style={{ textAlign: "center", fontStyle: "italic", fontWeight: 600 }}>
                Jumlah
              </td>
              <td style={{ textAlign: "right", fontStyle: "italic", fontWeight: 600, whiteSpace: "nowrap" }}>
                {formatPlainRupiah(totalPerolehan)}
              </td>
              <td contentEditable suppressContentEditableWarning className={`${prefix}lamp-edit`} style={{ textAlign: "right", fontStyle: "italic", fontWeight: 600, whiteSpace: "nowrap" }}>
                {/* manual sum nilai taksiran */}
              </td>
              <td colSpan={2} />
            </tr>
          )}
        </tbody>
      </table>
  );

  const renderSignature = () => (
      <div className={`${prefix}lamp-ttd`}>
        <p>Kepala Balai,</p>
        <div className={`${prefix}lamp-ttd-placeholder`}>${"{ttd_pengirim}"}</div>
        <p className={`${prefix}lamp-ttd-name`}>{kepalaBalai.nama}</p>
        <p>NIP. {kepalaBalai.nip}</p>
      </div>
  );

  return (
    <div className={`${prefix}lamp-root`}>
      {pages.map((page, pageIndex) => (
        <div
          className={`${prefix}lamp-page${pageIndex > 0 ? ` ${prefix}lamp-page-continuation` : ""}${page.includeSignature ? ` ${prefix}lamp-page-with-signature` : ""}`}
          key={`${prefix}lamp-page-${pageIndex}`}
        >
          {page.includeMeta && renderMetaTitle()}
          {renderTable(page)}
          {page.includeSignature && renderSignature()}
        </div>
      ))}
    </div>
  );
}
