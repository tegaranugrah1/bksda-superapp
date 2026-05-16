/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { History, Building2, UserCircle } from "lucide-react";

const CARDS = [
  {
    title: "Sejarah",
    description:
      "Pelajari tapak tilas dan awal mula berdirinya Balai Konservasi Sumber Daya Alam Kalimantan Timur.",
    icon: History,
    href: "/page/sejarah",
  },
  {
    title: "Organisasi",
    description:
      "Informasi mengenai struktur kelembagaan, tugas pokok, dan fungsi BKSDA Kalimantan Timur.",
    icon: Building2,
    href: "/page/organisasi",
  },
  {
    title: "Kepala Balai",
    description:
      "Profil singkat pucuk pimpinan Balai Konservasi Sumber Daya Alam Provinsi Kalimantan Timur.",
    icon: UserCircle,
    href: "/page/kepala-balai",
  },
];

export default function ProfilPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="relative h-[320px] md:h-[400px] bg-green-900 overflow-hidden flex items-center justify-center">
        <img
          src="/assets/header-new.png"
          alt="Profil BKSDA"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-green-900/90 via-green-900/40 to-green-900/60" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-wider uppercase mb-4">
            Tentang Kami
          </h1>
          <div className="w-20 h-1.5 bg-green-400 mx-auto rounded-full" />
          <p className="text-green-200 mt-4 max-w-lg mx-auto text-sm md:text-base">
            Mengenal lebih dekat Balai Konservasi Sumber Daya Alam Kalimantan
            Timur — visi, misi, dan struktur organisasi.
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-20 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all p-8 flex flex-col items-center text-center border border-gray-100 hover:-translate-y-2 duration-300"
              >
                <div className="w-16 h-16 rounded-full bg-green-50 group-hover:bg-green-500 text-green-600 group-hover:text-white transition-colors duration-300 flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3 group-hover:text-green-700 transition-colors uppercase">
                  {card.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
