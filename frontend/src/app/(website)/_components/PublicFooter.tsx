"use client";

import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface WebsiteData {
  nama_instansi?: string;
  alamat?: string;
  telepon?: string;
  email?: string;
  fax?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  twitter?: string;
  tentang?: string;
}

interface LinkItem {
  id: string;
  judul: string;
  url: string;
  logo_path?: string;
}

export default function PublicFooter() {
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/cms/public/website`)
      .then((r) => setWebsite(r.data?.data))
      .catch(() => {});
    axios
      .get(`${API_BASE}/cms/public/links`)
      .then((r) => setLinks(r.data?.data || []))
      .catch(() => {});
  }, []);

  return (
    <footer className="bg-green-900 text-white">
      {/* Kolom Utama */}
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Kolom 1: Tentang */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/logo_bksda.png"
              alt="Logo"
              className="h-10 w-10 object-contain brightness-200"
            />
            <p className="font-black text-lg">
              {website?.nama_instansi || "BKSDA"}
            </p>
          </div>
          <p className="text-green-200 text-sm leading-relaxed">
            {website?.tentang ||
              "Balai Konservasi Sumber Daya Alam — Kementerian Lingkungan Hidup dan Kehutanan Republik Indonesia."}
          </p>
        </div>

        {/* Kolom 2: Kontak */}
        <div>
          <h4 className="font-bold text-sm uppercase tracking-widest mb-4 text-green-300">
            Kontak
          </h4>
          <ul className="space-y-2 text-sm text-green-200">
            {website?.alamat && <li>📍 {website.alamat}</li>}
            {website?.telepon && <li>📞 {website.telepon}</li>}
            {website?.email && <li>✉️ {website.email}</li>}
            {website?.fax && <li>📠 Fax: {website.fax}</li>}
          </ul>
          {/* Sosial Media */}
          <div className="flex gap-3 mt-4">
            {website?.facebook && (
              <a
                href={website.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-green-800 flex items-center justify-center hover:bg-green-700 transition-colors text-sm"
              >
                FB
              </a>
            )}
            {website?.instagram && (
              <a
                href={website.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-green-800 flex items-center justify-center hover:bg-green-700 transition-colors text-sm"
              >
                IG
              </a>
            )}
            {website?.youtube && (
              <a
                href={website.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-green-800 flex items-center justify-center hover:bg-green-700 transition-colors text-sm"
              >
                YT
              </a>
            )}
          </div>
        </div>

        {/* Kolom 3: Link Terkait */}
        <div>
          <h4 className="font-bold text-sm uppercase tracking-widest mb-4 text-green-300">
            Link Terkait
          </h4>
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-200 hover:text-white transition-colors flex items-center gap-2"
                >
                  {link.logo_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${link.logo_path}`}
                      alt=""
                      className="w-4 h-4 object-contain"
                    />
                  )}
                  {link.judul}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-green-800 py-4">
        <p className="text-center text-xs text-green-400">
          © {new Date().getFullYear()} {website?.nama_instansi || "BKSDA"} —
          Kementerian LHK RI. Hak Cipta Dilindungi.
        </p>
      </div>
    </footer>
  );
}
