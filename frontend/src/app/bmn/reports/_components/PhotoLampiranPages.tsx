"use client";

import { BmnMediaImage } from "@/components/BmnMediaImage";

export interface PhotoLampiranEntry {
  key: string | number;
  title: string;
  photos: string[];
}

interface PhotoLampiranPagesProps {
  pages: PhotoLampiranEntry[][];
  headerSrc: string;
  headerClassName: string;
}

export function PhotoLampiranPages({
  pages,
  headerSrc,
  headerClassName,
}: PhotoLampiranPagesProps) {
  return (
    <>
      {pages.map((pageGroup, pageIndex) => (
        <article key={`photo-page-${pageIndex}`} className="photo-lampiran-page shadow-xl ring-1 ring-zinc-200 mt-6">
          <div className={headerClassName}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <BmnMediaImage src={headerSrc} alt="Kop Surat" />
          </div>

          {pageIndex === 0 && (
            <div className="photo-lampiran-title">
              <p>LAMPIRAN DOKUMENTASI FOTO BARANG MILIK NEGARA</p>
            </div>
          )}

          {pageGroup.map((entry) => (
            <div key={`photo-${entry.key}`} className="photo-asset-block avoid-break">
              <p className="photo-asset-title">{entry.title}</p>
              <div className="photo-grid-row">
                {entry.photos.length > 0 ? (
                  entry.photos.map((photoUrl, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <BmnMediaImage
                      key={idx}
                      src={photoUrl}
                      alt={`${entry.title} ${idx + 1}`}
                      className="photo-img"
                    />
                  ))
                ) : (
                  <>
                    <div className="photo-placeholder">
                      <span>Foto 1 (Tampak Depan)</span>
                    </div>
                    <div className="photo-placeholder">
                      <span>Foto 2 (Tampak Belakang)</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </article>
      ))}
    </>
  );
}
