"use client";

import { Props } from "./templates/shared";
import { RekapPreview } from "./templates/folu/RekapPreview";
import { SpbPreview } from "./templates/folu/SpbPreview";
import { DaftarIsianPreview } from "./templates/folu/DaftarIsianPreview";
import { KwitansiPreview } from "./templates/folu/KwitansiPreview";
import { RinbaFoluPreview } from "./templates/folu/RinbaFoluPreview";
import { SpdPreview } from "./templates/folu/SpdPreview";
import { NominatifDipaPreview } from "./templates/dipa/NominatifDipaPreview";
import { SptjbDipaPreview } from "./templates/dipa/SptjbDipaPreview";
import { RinbaDipaPreview } from "./templates/dipa/RinbaDipaPreview";
import { SpbyDipaPreview } from "./templates/dipa/SpbyDipaPreview";
import { SpdDepanDipaPreview } from "./templates/dipa/SpdDepanDipaPreview";

// Re-export shared types & helpers for full backward compatibility
export * from "./templates/shared";

// Re-export all sub-template components
export {
  RekapPreview,
  SpbPreview,
  DaftarIsianPreview,
  KwitansiPreview,
  RinbaFoluPreview,
  SpdPreview,
  NominatifDipaPreview,
  SptjbDipaPreview,
  RinbaDipaPreview,
  SpbyDipaPreview,
  SpdDepanDipaPreview,
};

export function DocumentTemplates(props: Props) {
  const {
    selectedDocument,
    recipients,
    activity,
    travel,
    sptNumber,
    ppk,
    pdo,
    verifikator,
    total,
    spbNumber,
    spdNumber,
    spbConfig,
    spdConfig,
    kwitansiConfig,
    tipeAnggaran,
  } = props;
  const doc = (selectedDocument || "").toLowerCase();

  // DIPA Documents
  if (doc === "spby-dipa" || doc === "spby") {
    return <SpbyDipaPreview {...props} />;
  }
  if (doc === "sptjb-dipa") {
    return <SptjbDipaPreview {...props} />;
  }
  if (doc === "rinba-dipa") {
    return <RinbaDipaPreview {...props} />;
  }
  if (doc === "nominatif-dipa" || doc.includes("nominatif")) {
    return <NominatifDipaPreview {...props} />;
  }
  if (doc === "spd-dipa") {
    return <SpdDepanDipaPreview {...props} />;
  }

  // FOLU & General Documents
  if (doc === "sptjb" || doc.includes("sptjb") || doc.includes("rekap")) {
    if (tipeAnggaran === "DIPA") {
      return <SptjbDipaPreview {...props} />;
    }
    return <RekapPreview recipients={recipients} activity={activity} travel={travel} ppk={ppk} pdo={pdo} total={total} />;
  }
  if (doc === "spb" || doc.includes("spb") || doc.includes("persetujuan")) {
    if (tipeAnggaran === "DIPA") {
      return <SpbyDipaPreview {...props} />;
    }
    return (
      <SpbPreview
        recipients={recipients}
        activity={activity}
        sptNumber={sptNumber}
        ppk={ppk}
        pdo={pdo}
        verifikator={verifikator}
        spbNumber={spbNumber}
        spbConfig={spbConfig}
      />
    );
  }
  if (doc === "daftar-isian" || doc.includes("daftar") || doc.includes("isian")) {
    return <DaftarIsianPreview recipients={recipients} activity={activity} travel={travel} />;
  }
  if (doc === "kuitansi" || doc.includes("kuitansi") || doc.includes("kwitansi")) {
    return (
      <KwitansiPreview
        recipients={recipients}
        activity={activity}
        sptNumber={sptNumber}
        ppk={ppk}
        pdo={pdo}
        kwitansiConfig={kwitansiConfig}
      />
    );
  }
  if (doc === "rinba" || doc.includes("rinba")) {
    if (tipeAnggaran === "DIPA") {
      return <RinbaDipaPreview {...props} />;
    }
    return <RinbaFoluPreview recipients={recipients} travel={travel} sptNumber={sptNumber} ppk={ppk} pdo={pdo} spdNumber={spdNumber} />;
  }
  if (doc === "spd" || doc.includes("spd")) {
    if (tipeAnggaran === "DIPA") {
      return <SpdDepanDipaPreview {...props} />;
    }
    return <SpdPreview recipients={recipients} activity={activity} travel={travel} sptNumber={sptNumber} ppk={ppk} spdNumber={spdNumber} spdConfig={spdConfig} />;
  }

  if (tipeAnggaran === "DIPA") {
    return <SpbyDipaPreview {...props} />;
  }
  return <RekapPreview recipients={recipients} activity={activity} travel={travel} ppk={ppk} pdo={pdo} total={total} />;
}
