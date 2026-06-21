"use client";

import { useState } from "react";
import axios from "axios";
import { Send, MapPin, Phone, Mail, Loader2, CheckCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL;
const MAP_EMBED_URL =
  "https://www.openstreetmap.org/export/embed.html?bbox=106.7908%2C-6.2443%2C106.8108%2C-6.2243&layer=mapnik&marker=-6.2343%2C106.8008";
const MAP_LINK_URL =
  "https://www.openstreetmap.org/search?query=Jl.%20Raden%20Patah%20No.%201%20Jakarta%20Selatan%20Indonesia";

interface FormData {
  nama: string;
  email: string;
  telepon: string;
  subjek: string;
  pesan: string;
}

export default function HubungiKamiPage() {
  const [formData, setFormData] = useState<FormData>({
    nama: "",
    email: "",
    telepon: "",
    subjek: "",
    pesan: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post(`${API}/cms/public/pesan`, formData);
      setSuccess(true);
      setFormData({
        nama: "",
        email: "",
        telepon: "",
        subjek: "",
        pesan: "",
      });
    } catch {
      setError("Gagal mengirim pesan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* ═══ KIRI: Info Kontak ═══ */}
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 flex items-center gap-3">
            <Send className="w-9 h-9 text-green-600" /> Hubungi Kami
          </h1>
          <p className="text-gray-500 mt-3 max-w-md">
            Ada pertanyaan atau masukan untuk BKSDA? Silakan hubungi kami
            melalui formulir di samping atau melalui kontak di bawah ini.
          </p>

          {/* Info Kontak */}
          <div className="mt-10 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Alamat</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Jl. Raden Patah No. 1, Komplek Bandar鸭
                  <br />
                  Jakarta Selatan, Indonesia
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Telepon</h3>
                <p className="text-gray-500 text-sm mt-1">(021) 1234-5678</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Email</h3>
                <p className="text-gray-500 text-sm mt-1">info@bksda.go.id</p>
              </div>
            </div>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
            <iframe
              title="Peta lokasi kantor BKSDA"
              src={MAP_EMBED_URL}
              className="h-64 w-full"
              loading="lazy"
            />
            <a
              href={MAP_LINK_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-3 text-sm font-bold text-green-700 hover:text-green-600"
            >
              <MapPin className="h-4 w-4" />
              Buka peta lokasi
            </a>
          </div>
        </div>

        {/* ═══ KANAN: Form Pesan ═══ */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-xl font-black text-gray-900">
                Pesan Berhasil Terkirim!
              </h3>
              <p className="text-gray-500 mt-2">
                Terima kasih atas pesan Anda. Kami akan segera merespons.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors"
              >
                Kirim Pesan Lagi
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-black text-gray-900 mb-6">
                Kirim Pesan
              </h2>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="nama"
                    className="block text-sm font-bold text-gray-700 mb-1.5"
                  >
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    id="nama"
                    name="nama"
                    value={formData.nama}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                    placeholder="Masukkan nama lengkap Anda"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-bold text-gray-700 mb-1.5"
                    >
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                      placeholder="email@contoh.com"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="telepon"
                      className="block text-sm font-bold text-gray-700 mb-1.5"
                    >
                      No. Telepon
                    </label>
                    <input
                      type="tel"
                      id="telepon"
                      name="telepon"
                      value={formData.telepon}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subjek"
                    className="block text-sm font-bold text-gray-700 mb-1.5"
                  >
                    Subjek *
                  </label>
                  <input
                    type="text"
                    id="subjek"
                    name="subjek"
                    value={formData.subjek}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                    placeholder="Judul pesan Anda"
                  />
                </div>

                <div>
                  <label
                    htmlFor="pesan"
                    className="block text-sm font-bold text-gray-700 mb-1.5"
                  >
                    Pesan *
                  </label>
                  <textarea
                    id="pesan"
                    name="pesan"
                    value={formData.pesan}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all resize-none"
                    placeholder="Tulis pesan Anda di sini..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-400 text-white font-bold py-3.5 rounded-xl transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Kirim Pesan
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}




